# Integración ESP32 ↔ Vercel (poll + report)

Objetivo: que tu ESP32 se controle **desde cualquier lugar** con la web en Vercel, sin abrir puertos en el router.

Tu ESP32 hará:

- `POST https://<tu-app>.vercel.app/api/device/poll` → recibir un comando (o `null`)
- `POST https://<tu-app>.vercel.app/api/device/report` → enviar estado/heartbeat (para online/offline)

Ambos endpoints requieren el header `x-device-token`.

## 1) Configuración (copia y pega)

Añade estas includes junto a las que ya tienes:

```cpp
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
```

Añade esta config (cerca de tu config WiFi):

```cpp
static const char *CLOUD_BASE_URL = "https://digitales-mcca.vercel.app";
static const char *DEVICE_ID = "mcca-8x32";
static const char *DEVICE_TOKEN = "CAMBIA_ESTO_POR_TU_DEVICE_TOKEN";

static constexpr uint32_t POLL_EVERY_MS = 1000;   // cada 1s pedimos comando
static constexpr uint32_t REPORT_EVERY_MS = 2000; // cada 2s reportamos estado

static unsigned long lastPollMs = 0;
static unsigned long lastReportMs = 0;
```

> Nota TLS: para simplificar uso `setInsecure()` (no valida certificados). Para producción “real”, lo correcto es fijar el CA root de Vercel.

## 2) Helper HTTP JSON (copia y pega)

```cpp
static bool cloudPostJson(const String &path, const String &jsonBody, String &outResponse, int &outCode) {
  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  String url = String(CLOUD_BASE_URL) + path;
  if (!http.begin(client, url)) return false;

  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-token", DEVICE_TOKEN);

  outCode = http.POST((uint8_t *)jsonBody.c_str(), jsonBody.length());
  outResponse = (outCode > 0) ? http.getString() : "";
  http.end();
  return outCode > 0;
}
```

## 3) Poll de comandos (copia y pega)

Esto pide un comando; si llega, lo aplica usando tus funciones existentes:

- `applyScrollText(text, speedMs)`
- `handleOff()` / `clearBuffer()` / `updateHardware()`
- lógica de pattern (igual que `handlePattern()`)

```cpp
static void cloudPollAndApply() {
  if (WiFi.status() != WL_CONNECTED) return;
  unsigned long now = millis();
  if (now - lastPollMs < POLL_EVERY_MS) return;
  lastPollMs = now;

  StaticJsonDocument<96> req;
  req["deviceId"] = DEVICE_ID;
  String reqBody;
  serializeJson(req, reqBody);

  String resp;
  int code = 0;
  if (!cloudPostJson("/api/device/poll", reqBody, resp, code)) return;
  if (code != 200) return;

  StaticJsonDocument<768> doc;
  DeserializationError err = deserializeJson(doc, resp);
  if (err) return;

  if (!(doc["ok"] | false)) return;
  if (doc["command"].isNull()) return;

  const char *type = doc["command"]["type"] | "";

  if (strcmp(type, "off") == 0) {
    mode = DisplayMode::OFF;
    clearBuffer();
    updateHardware();
    return;
  }

  if (strcmp(type, "text") == 0) {
    const char *text = doc["command"]["text"] | "";
    uint32_t speedMs = doc["command"]["speedMs"] | scrollSpeedMs;
    if (doc["command"].containsKey("intensity")) {
      gIntensity = ((uint8_t)doc["command"]["intensity"].as<uint32_t>()) & 0x0F;
      setIntensityAll(gIntensity);
    }
    applyScrollText(String(text), speedMs);
    return;
  }

  if (strcmp(type, "pattern") == 0) {
    bool invert = doc["command"]["invert"] | false;
    currentInvert = invert;
    JsonArray arr = doc["command"]["bitmap"].as<JsonArray>();
    if (arr.size() != ROWS) return;
    for (uint8_t y = 0; y < ROWS; ++y) {
      uint32_t mask = (uint32_t)arr[y].as<uint32_t>();
      if (invert) mask = (~mask) & 0xFFFFFFFFUL;
      rowMasks[y] = mask;
    }
    if (doc["command"].containsKey("intensity")) {
      gIntensity = ((uint8_t)doc["command"]["intensity"].as<uint32_t>()) & 0x0F;
      setIntensityAll(gIntensity);
    }
    mode = DisplayMode::STATIC_PATTERN;
    hwDirty = true;
    updateHardware();
    return;
  }
}
```

## 4) Report de estado (heartbeat) (copia y pega)

Esto manda un “estado compacto” que la web usa para mostrar ONLINE/OFFLINE.

```cpp
static void cloudReportState() {
  if (WiFi.status() != WL_CONNECTED) return;
  unsigned long now = millis();
  if (now - lastReportMs < REPORT_EVERY_MS) return;
  lastReportMs = now;

  StaticJsonDocument<768> payload;
  payload["deviceId"] = DEVICE_ID;

  JsonObject state = payload.createNestedObject("state");
  if (mode == DisplayMode::OFF) state["mode"] = "off";
  else if (mode == DisplayMode::STATIC_PATTERN) state["mode"] = "pattern";
  else state["mode"] = "text";

  state["intensity"] = gIntensity;
  state["speedMs"] = scrollSpeedMs;
  state["invert"] = currentInvert;
  state["text"] = currentText;

  // opcional: manda bitmap (ojo tamaño). Para tu matriz 8x32 está OK.
  JsonArray arr = state.createNestedArray("bitmap");
  for (uint8_t y = 0; y < ROWS; ++y) arr.add(rowMasks[y]);

  String body;
  serializeJson(payload, body);

  String resp;
  int code = 0;
  cloudPostJson("/api/device/report", body, resp, code);
}
```

## 5) Llamarlo desde tu `loop()`

En tu `loop()` agrega:

```cpp
cloudPollAndApply();
cloudReportState();
```

Queda algo así:

```cpp
void loop() {
  server.handleClient();
  processSerialInput();

  cloudPollAndApply();
  cloudReportState();

  if (mode == DisplayMode::SCROLL_TEXT) {
    // ... tu scroll actual ...
  }
}
```

## 6) Variables en Vercel que deben coincidir

En Vercel define:

- `DEVICE_TOKEN` = el mismo valor que pusiste en `DEVICE_TOKEN` del firmware
- `AUTH_PASSWORD` y `AUTH_SECRET`
- KV: `KV_REST_API_URL`, `KV_REST_API_TOKEN`

