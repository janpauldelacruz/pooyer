//+------------------------------------------------------------------+
//|                                              LiveSignalsFeed.mq5 |
//|   ZEROEMOTIONS | live-signals.com price feed (IC Markets SC)     |
//|                                                                  |
//|   Read-only feeder: pushes the chart symbol's bid/ask and M1     |
//|   bars (UTC) to Supabase so https://live-signals.com can stream  |
//|   IC Markets SC prices. This EA NEVER places, modifies or closes |
//|   trades.                                                        |
//|                                                                  |
//|   SETUP: Tools > Options > Expert Advisors >                     |
//|          "Allow WebRequest for listed URL" and add               |
//|          https://thzzaefvvktwnlkljxlh.supabase.co                |
//+------------------------------------------------------------------+
#property copyright "AURELIA EMPIRE / ZEROEMOTIONS"
#property version   "1.00"

//--- inputs
input string InpSupabaseUrl   = "https://thzzaefvvktwnlkljxlh.supabase.co"; // Supabase project URL
input string InpApiKey        = "sb_publishable_HPd8EwAwAZElWHSFpdClJw_uhPZKDFD"; // Publishable (public) key
input string InpIngestToken   = "";        // Ingest token (private - paste from Claude chat)
input string InpSymbol        = "";        // Symbol to feed ("" = chart symbol, e.g. BTCUSD)
input string InpPublishAs     = "BTCUSD";  // Name the website reads
input int    InpPushMs        = 1000;      // Push interval (ms)
input int    InpHeartbeatSec  = 5;         // Push even if price unchanged after N sec
input int    InpBackfillBars  = 1440;      // M1 bars to upload on start (max 4320)
input int    InpTimeoutMs     = 4000;      // HTTP timeout (ms)
input bool   InpVerboseLog    = false;     // Log every push (else errors + milestones)

//--- state
string   g_symbol      = "";
string   g_endpoint    = "";
int      g_digits      = 2;
long     g_srvOffset   = 0;      // server time - UTC, seconds (rounded to 30 min)
datetime g_lastBar     = 0;      // last M1 bar open (server time) already sent as closed
int      g_backfillLeft = 0;     // bars still to backfill
double   g_lastBid     = 0.0;
double   g_lastAsk     = 0.0;
ulong    g_lastPushUs  = 0;
ulong    g_lastStatsUs = 0;
int      g_failStreak  = 0;
ulong    g_nextTryUs   = 0;
double   g_dayOpen = 0.0, g_dayHigh = 0.0, g_dayLow = 0.0;
long     g_pushes = 0, g_failures = 0;

//--- microsecond clock anchored to UTC at init
ulong    g_anchorUs    = 0;
datetime g_anchorGmt   = 0;

//+------------------------------------------------------------------+
//| Structured JSON log line with microsecond UTC timestamp           |
//+------------------------------------------------------------------+
string IsoUtcMicros()
  {
   ulong  nowUs   = GetMicrosecondCount();
   ulong  elapsed = nowUs - g_anchorUs;
   datetime secs  = g_anchorGmt + (datetime)(elapsed / 1000000);
   ulong  micros  = elapsed % 1000000;
   MqlDateTime t;
   TimeToStruct(secs, t);
   return StringFormat("%04d-%02d-%02dT%02d:%02d:%02d.%06I64uZ",
                       t.year, t.mon, t.day, t.hour, t.min, t.sec, micros);
  }

string JsonEscape(const string s)
  {
   string r = s;
   StringReplace(r, "\\", "\\\\");
   StringReplace(r, "\"", "\\\"");
   StringReplace(r, "\r", " ");
   StringReplace(r, "\n", " ");
   return r;
  }

void LogJson(const string level, const string event, const string extraJson = "")
  {
   string line = StringFormat("{\"ts\":\"%s\",\"level\":\"%s\",\"ea\":\"LiveSignalsFeed\",\"symbol\":\"%s\",\"event\":\"%s\"%s%s}",
                              IsoUtcMicros(), level, g_symbol, JsonEscape(event),
                              (extraJson == "" ? "" : ","), extraJson);
   Print(line);
  }

//+------------------------------------------------------------------+
//| Helpers                                                           |
//+------------------------------------------------------------------+
string Num(const double v) { return DoubleToString(v, g_digits); }

long ComputeServerOffset()
  {
   long diff = (long)TimeTradeServer() - (long)TimeGMT();
   // round to nearest 30 minutes (broker offsets are whole/half hours)
   long half = 1800;
   return (long)MathRound((double)diff / (double)half) * half;
  }

long ToUtcMs(const datetime serverTime)
  {
   return ((long)serverTime - g_srvOffset) * 1000;
  }

string BarJson(const MqlRates &r)
  {
   return StringFormat("{\"t\":%I64d,\"o\":%s,\"h\":%s,\"l\":%s,\"c\":%s,\"v\":%I64d}",
                       ToUtcMs(r.time), Num(r.open), Num(r.high), Num(r.low), Num(r.close),
                       r.tick_volume);
  }

//--- rolling 24h open/high/low from M1 history (refreshed once a minute)
void RefreshDayStats()
  {
   MqlRates rates[];
   ArraySetAsSeries(rates, false);
   int n = CopyRates(g_symbol, PERIOD_M1, 0, 1440, rates);
   if(n <= 0)
      return;
   g_dayOpen = rates[0].open;
   g_dayHigh = rates[0].high;
   g_dayLow  = rates[0].low;
   for(int i = 1; i < n; i++)
     {
      if(rates[i].high > g_dayHigh) g_dayHigh = rates[i].high;
      if(rates[i].low  < g_dayLow)  g_dayLow  = rates[i].low;
     }
  }

//+------------------------------------------------------------------+
//| HTTP POST to the ingest RPC                                       |
//+------------------------------------------------------------------+
bool PostIngest(const double bid, const double ask, const string barsJson, int &httpCode, string &resp)
  {
   string body = StringFormat(
      "{\"p_token\":\"%s\",\"p_symbol\":\"%s\",\"p_bid\":%s,\"p_ask\":%s,"
      "\"p_day_open\":%s,\"p_day_high\":%s,\"p_day_low\":%s,"
      "\"p_server_time_ms\":%I64d,\"p_bars\":%s}",
      JsonEscape(InpIngestToken), JsonEscape(InpPublishAs), Num(bid), Num(ask),
      Num(g_dayOpen), Num(g_dayHigh), Num(g_dayLow),
      (long)TimeTradeServer() * 1000, barsJson);

   char data[];
   char result[];
   string resHeaders = "";
   int len = StringToCharArray(body, data, 0, WHOLE_ARRAY, CP_UTF8);
   if(len > 0)
      ArrayResize(data, len - 1);   // drop trailing NUL

   string headers = "Content-Type: application/json\r\napikey: " + InpApiKey + "\r\n";
   ResetLastError();
   httpCode = WebRequest("POST", g_endpoint, headers, InpTimeoutMs, data, result, resHeaders);
   resp = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
   return (httpCode >= 200 && httpCode < 300);
  }

//+------------------------------------------------------------------+
//| Build the bars payload: backfill chunk, or the last 2 M1 bars     |
//+------------------------------------------------------------------+
string BuildBars(int &sentCount, bool &isBackfill)
  {
   MqlRates rates[];
   ArraySetAsSeries(rates, false);
   isBackfill = (g_backfillLeft > 0);
   int want = isBackfill ? MathMin(g_backfillLeft, 500) : 2;
   int start = isBackfill ? g_backfillLeft - want : 0; // oldest chunk first
   int n = CopyRates(g_symbol, PERIOD_M1, start, want, rates);
   sentCount = 0;
   if(n <= 0)
      return "[]";
   string out = "[";
   for(int i = 0; i < n; i++)
     {
      if(i > 0) out += ",";
      out += BarJson(rates[i]);
     }
   out += "]";
   sentCount = n;
   if(!isBackfill && n > 0)
      g_lastBar = rates[n - 1].time;
   return out;
  }

//+------------------------------------------------------------------+
int OnInit()
  {
   g_anchorUs  = GetMicrosecondCount();
   g_anchorGmt = TimeGMT();

   g_symbol = (InpSymbol == "" ? _Symbol : InpSymbol);
   if(!SymbolSelect(g_symbol, true))
     {
      LogJson("ERROR", "symbol_not_found", StringFormat("\"requested\":\"%s\"", JsonEscape(g_symbol)));
      return INIT_PARAMETERS_INCORRECT;
     }
   if(StringLen(InpIngestToken) < 16)
     {
      LogJson("ERROR", "missing_ingest_token", "\"hint\":\"paste the ingest token into InpIngestToken\"");
      return INIT_PARAMETERS_INCORRECT;
     }
   if(InpPushMs < 250)
     {
      LogJson("ERROR", "push_interval_too_low", StringFormat("\"push_ms\":%d,\"min\":250", InpPushMs));
      return INIT_PARAMETERS_INCORRECT;
     }

   g_digits   = (int)SymbolInfoInteger(g_symbol, SYMBOL_DIGITS);
   g_endpoint = InpSupabaseUrl + "/rest/v1/rpc/ingest_market";
   g_srvOffset = ComputeServerOffset();
   g_backfillLeft = MathMax(0, MathMin(InpBackfillBars, 4320));
   RefreshDayStats();
   g_lastStatsUs = GetMicrosecondCount();

   if(!EventSetMillisecondTimer(InpPushMs))
     {
      LogJson("ERROR", "timer_failed", StringFormat("\"err\":%d", GetLastError()));
      return INIT_FAILED;
     }
   LogJson("INFO", "started",
           StringFormat("\"publish_as\":\"%s\",\"server_offset_sec\":%I64d,\"backfill\":%d,\"push_ms\":%d",
                        JsonEscape(InpPublishAs), g_srvOffset, g_backfillLeft, InpPushMs));
   return INIT_SUCCEEDED;
  }

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   EventKillTimer();
   LogJson("INFO", "stopped",
           StringFormat("\"reason\":%d,\"pushes\":%I64d,\"failures\":%I64d", reason, g_pushes, g_failures));
  }

//+------------------------------------------------------------------+
void OnTimer()
  {
   ulong nowUs = GetMicrosecondCount();
   if(nowUs < g_nextTryUs)
      return; // backing off after failures

   MqlTick tick;
   if(!SymbolInfoTick(g_symbol, tick) || tick.bid <= 0.0 || tick.ask <= 0.0)
      return;

   // refresh rolling 24h stats + broker offset (DST changes) once a minute
   if(nowUs - g_lastStatsUs >= 60000000)
     {
      RefreshDayStats();
      long off = ComputeServerOffset();
      if(off != g_srvOffset)
        {
         LogJson("WARN", "server_offset_changed", StringFormat("\"old\":%I64d,\"new\":%I64d", g_srvOffset, off));
         g_srvOffset = off;
        }
      g_lastStatsUs = nowUs;
     }

   datetime curBar = iTime(g_symbol, PERIOD_M1, 0);
   bool priceChanged = (tick.bid != g_lastBid || tick.ask != g_lastAsk);
   bool newBar       = (curBar != g_lastBar);
   bool heartbeatDue = (nowUs - g_lastPushUs) >= (ulong)InpHeartbeatSec * 1000000;
   if(g_backfillLeft == 0 && !priceChanged && !newBar && !heartbeatDue)
      return;

   int sent = 0;
   bool isBackfill = false;
   string bars = BuildBars(sent, isBackfill);

   int code = 0;
   string resp = "";
   bool ok = PostIngest(tick.bid, tick.ask, bars, code, resp);
   if(ok)
     {
      g_pushes++;
      g_failStreak = 0;
      g_lastPushUs = nowUs;
      g_lastBid = tick.bid;
      g_lastAsk = tick.ask;
      if(isBackfill)
        {
         g_backfillLeft -= sent;
         if(sent == 0) g_backfillLeft = 0;
         LogJson("INFO", "backfill_chunk", StringFormat("\"bars\":%d,\"remaining\":%d", sent, g_backfillLeft));
        }
      else if(InpVerboseLog)
         LogJson("DEBUG", "push_ok", StringFormat("\"bid\":%s,\"ask\":%s,\"bars\":%d", Num(tick.bid), Num(tick.ask), sent));
     }
   else
     {
      g_failures++;
      g_failStreak++;
      int err = GetLastError();
      // exponential backoff: 2s, 4s, 8s ... capped at 60s
      ulong backoffUs = (ulong)MathMin(60.0, MathPow(2.0, MathMin(g_failStreak, 6))) * 1000000;
      g_nextTryUs = nowUs + backoffUs;
      string hint = "";
      if(code == -1 && err == 4014)
         hint = "add the Supabase URL to Tools > Options > Expert Advisors > Allow WebRequest";
      else if(code == 401 || code == 403 || StringFind(resp, "invalid ingest token") >= 0)
         hint = "check InpIngestToken / InpApiKey";
      LogJson("ERROR", "push_failed",
              StringFormat("\"http\":%d,\"err\":%d,\"streak\":%d,\"backoff_sec\":%I64u,\"hint\":\"%s\",\"resp\":\"%s\"",
                           code, err, g_failStreak, backoffUs / 1000000, JsonEscape(hint),
                           JsonEscape(StringSubstr(resp, 0, 200))));
     }
  }

//+------------------------------------------------------------------+
void OnTick()
  {
   // all work runs on the timer; nothing to do per tick
  }
//+------------------------------------------------------------------+
