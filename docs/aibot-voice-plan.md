# AIBot Voice Plan

## Faze 1: Web MVP

Aktualni webovy klient `/AIBot` umi:

- textovy chat
- mikrofon na jedno stisknuti
- prehrani hlasove odpovedi pres browser TTS
- experimentalni hands-free rezim s wake slovem `Breto`

Omezeni web MVP:

- funguje jen pri otevrene karte
- vyzaduje povoleny mikrofon v browseru
- wake word bezi pres browser SpeechRecognition, takze neni 100% spolehlivy
- po uspani notebooku nebo ztrate permission se musi znovu zapnout

## Faze 2: Lokalni Mac Listener

Pro spolehlivejsi 24/7 wake word je lepsi lokalni listener na Macu:

- background proces nebo menu bar app
- stale posloucha mikrofon
- lokalne detekuje wake word `Breto`
- po probuzeni preda dotaz do `beets.cz/AIBot` nebo primo do backend route
- odpoved precte pres system TTS

Vyhody:

- lepsi spolehlivost nez browser karta
- muze bezet po prihlaseni uzivatele
- wake word nebude zavisly na otevrene zalozce

Doporucena architektura:

1. wake word detection lokalne na Macu
2. STT lokalne nebo pres cloud
3. dotaz do `beets.cz/api/aibot/chat`
4. orchestraci a akce resi `n8n`
5. odpoved generuje Claude
6. TTS prehraje odpoved lokalne

## Co testovat ted

1. Otevrit `/AIBot`
2. Povolit mikrofon
3. Zapnout `Hands-free: Breto`
4. Rict `Breto`
5. Pockat na dotaz `Co potrebujes?`
6. Nadiktovat kratky pozadavek
7. Overit, ze odpoved prijde zpet textem i hlasem
