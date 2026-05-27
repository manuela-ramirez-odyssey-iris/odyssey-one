# Odyssey Customer Gateway — Project Overview

**Author:** Manuela Ramirez (Iris Software)
**Date:** 2026-04-16
**Purpose:** Reference document to understand the Gateway project before meetings

---

## 1. What is the Gateway?

The Gateway is **middleware** — software that sits between Odyssey's internal systems and each customer's ERP system. Its job is **data translation**: it takes data in the customer's format and converts it to Odyssey's format (and vice versa).

The Gateway was originally built on **Sterling Commerce** (now IBM Sterling), a platform that's been running for **20+ years**. Odyssey calls each instance a "Gateway."

**The key thing:** every customer has its **own custom Gateway instance** with its own configuration and translation logic. There is no shared, reusable translation layer — it's bespoke per customer.

The translation logic lives in **XSLT stylesheets** (`.xsl` files). These are XML-based transformation scripts that define how to map fields from one XML format to another. Each customer has a set of these stylesheets that handle their specific data formats.

---

## 2. The Problem

Three compounding issues make this unsustainable:

### 2.1 Onboarding is too slow
Setting up a new customer's Gateway integration takes **~1 month per customer**. With **47 customers** to migrate to the new Odyssey One platform, that's nearly 4 years of serial work.

### 2.2 Knowledge is concentrated in one person
The two engineers who built and maintained the Gateway over 20 years are **both gone**. **Ronald** is the only person left who understands the system — he was trained for 6 months by the departing veteran, but he's still just one person carrying all 47 customer integrations.

### 2.3 No visibility into what each customer does
There's no way to query "how does Customer X's integration work?" The logic is locked inside XSLT files that nobody has systematically documented. Each customer's gateway is a black box unless you manually read through all their `.xsl` files and `SysConfig.xml`.

**VP Nirab's mandate:** solve this at scale, not one customer at a time. That's why he assembled an AI-focused team.

---

## 3. The Goal

The project has two phases:

### Phase 1: Document (current focus)
- Read each customer's XSLT stylesheets and SysConfig
- Produce a **Mapping Rules Report** for each customer — a structured `.md` file documenting:
  - What messages they exchange
  - How fields map from customer format to Odyssey format
  - What conditional logic exists (filters, routing, date formatting)
  - What's unique to this customer vs. common patterns
- Compare across customers to find **universal rules** (common architecture that could be built once) vs. **delta rules** (per-customer deviations that need customization)

### Phase 2: Migrate to Boomi
- **Boomi** is a modern integration platform (iPaaS) that Odyssey has already deployed
- All **new** customers already go through Boomi
- The goal is to retire the legacy Gateway and move all existing customers to Boomi
- **Stretch goal:** use Boomi's AI capabilities to auto-generate translation flows from the XSLT corpus, rather than hand-rewriting each one

---

## 4. How a Gateway Works (Technically)

### 4.1 SysConfig.xml — The brain
Every customer gateway has a `SysConfig.xml` that defines:
- **JMS Services** — Java Message Service queues that messages flow through (e.g., `heubachinq`, `heubachoutq`)
- **Translator Pipelines** — chains of XSLT transformations applied to each message type
- **Routing Rules** — `<Rule type="forward">` blocks that decide which queue a message goes to, based on conditions like `rely_TYPE`, `rely_DOC_TYPE`, `rely_SOURCEID`
- **File Pollers** — directory watchers that pick up incoming files from customer FTP/SFTP drops

### 4.2 XSLT Stylesheets — The translation logic
Located in `deployment/platform/config/<CustomerTranslator>/`. Each `.xsl` file handles one type of transformation:
- **Inbound:** Customer format → Odyssey XML (e.g., SAP IDoc `DELVRY03` → `TransportationOrder`)
- **Outbound:** Odyssey XML → Customer format (e.g., `PlannedShipment` → SAP IDoc `SHPMNT04`)
- **Utility:** Archiving, filtering, pass-through

Common patterns inside XSLTs:
- **Field mapping tables** — `<xsl:value-of select="SAP/Field"/>` → `<OdysseyField>`
- **Conditional logic** — `<xsl:choose>/<xsl:when>` for routing decisions (domestic vs. international, mode derivation)
- **Date formatting** — SAP `YYYYMMDD` → ISO 8601 `YYYY-MM-DDTHH:MM:SS`
- **Lookup calls** — `GtwUtils:match()`, `GtwUtils:maintainCustomerOrg()`, `GtwUtils:getODFreightCost()` for database interactions

### 4.3 DOCTYPE codes — Message type identifiers
Each message type has a numeric code used in routing:

| DOCTYPE | Message Type |
|---------|-------------|
| 124 | InternalPlannedShipment |
| 126 | ShipItemBundle |
| 127 | ShippingSiteBundle |
| 128 | TransportationOrder / ExecutedShipment |
| 129 | PlannedShipment |
| 130 | ExportOrder |
| 131 | TransportationInvoice |
| 132 | FreightCostAllocation |
| 152 | ApprovedPayment |
| 154 | CarrierNotification |
| 155 | ApprovedPayment (alternate) |
| 158 | Shipment (ODM) |
| 169 | PaymentOrderTransaction |

### 4.4 Message routing
Messages flow through JMS queues. Routing is controlled by `<Rule>` blocks in SysConfig that match on properties:
- `rely_TYPE` — message category (e.g., `rely_TRANSLATED`, `rely_FORWARD_TRACKING_MSG`)
- `rely_DOC_TYPE` — the DOCTYPE number
- `rely_SOURCEID` — customer identifier (e.g., `HEUBACH`, `ASCENSUS`, `GRACE`)

Two SysConfigs manage routing:
- **Translators SysConfig** — PlannedShipment, SendShipment, CarrierNotification, FreightCostAllocation
- **Services SysConfig** — TrackingBundle, ApprovedPayment, TransportationInvoice

---

## 5. The Four Integrations

These are the four data flows between a customer's ERP and Odyssey. Refer to `Documentation/Customer flow.png` for the visual.

### 5.1 Order (Customer → Odyssey) — Phase 2
The customer sends purchase/delivery orders to Odyssey. Odyssey creates orders in its TMS.
- **Not our scope yet** — another dev team (Efrain) is building the ability to receive orders via integration.
- Formats vary: could be XML, flat file, EDI, FTP drop.

### 5.2 Shipment (Odyssey → Customer)
After Odyssey's TMS creates and tenders a shipment, it sends the shipment details back to the customer's ERP.
- Tells the customer: which orders are on this shipment, who's the carrier, when is pickup.
- **Our focus.** This is where `PlannedShipment` and `ExecutedShipment` XSLTs live.

### 5.3 PGI / Post-Goods-Issued (Customer → Odyssey)
Once the customer's warehouse picks, packs, and loads product onto the truck, they send a PGI message.
- Tells Odyssey: the actual ship date, what was actually loaded (quantities may differ from planned).
- **Hardest integration** — each customer sends PGI in their own format. ~100+ variants collapse to one Odyssey format.
- Also called "Pick, Pack, Load" in the flow diagram.

### 5.4 Freight Accrual (Odyssey → Customer)
After receiving PGI, Odyssey re-rates the shipment (weight/volume may have changed) and sends an updated freight cost back to the customer.
- Used for the customer's accounting/accrual purposes.
- **Our focus.**

---

## 6. Customer Landscape

### 6.1 The 47 gateways
The repo (`Legacy-Gateways/src/OLT/`) contains 47 customer gateway folders. Each has a platform version (NNCode):

| NN Platform | Customers |
|---|---|
| NN23010PROD.13 | AOCGateway, CarrierEMEA, Chromascape, Etex, Heubach, LPMGateway, MonumentGateway, MPM, MTGateway, SIGroupGateway, Swift, Valtris |
| NN12030QA.13 | Afton, AMS, Canlak, Elementis, G20Tech, GEON, GEOSC, Kemira, SmithFoods |
| NN15111PROD.4 | AscensusGateway, CIDXTranslator, ERCOGateway, Polyvantis, RohmGateway, SabicHPPGateway, SabicSAPGateway |
| NN19070PROD.4 | ABITape, Clariant, Fisher, IMCD, SHR |
| NN.09120.QA.10 | CNSender, GalataGateway, Hubspan, KleinschmidtGateway, MGMaher, ShipcoGateway |
| NN.19060.PS | DuBois, LanxessGateway, SolenisGateway, UreGateway |
| NN12080QA.24 | CTS-Vanguard, CTSGateway |
| NN11060QA.13 | Pinova |
| NN.7.7.0.2.7 | 315Gateway |

### 6.2 Complexity spectrum
XSL file counts range from 170 (315Gateway, simplest) to 359 (CarrierEMEA, most complex). This roughly correlates with the number of message types and transformation variants a customer uses.

### 6.3 D365 Gateway subset
12 of the 47 customers have an additional `d365gateway` configuration (Microsoft Dynamics 365 integration): AOCGateway, CarrierEMEA, Chromascape, Etex, Heubach, LPMGateway, MonumentGateway, MPM, MTGateway, SIGroupGateway, Swift, Valtris.

### 6.4 Shared gateways
Not all customers have their own dedicated folder. **GRACE** and **GCP** are handled by shared multi-customer gateways:
- **Hubspan** — Carrier Freight Invoice processing for both
- **KleinschmidtGateway** — Carrier Freight Invoice Transform for both
- **CNSender** — Carrier Notification Routing for both
- **CarrierEMEA** — European variant for GCP (`*GCP-EUR_SYS_01`)

### 6.5 Customer format diversity
From `GatewaySummary.xlsx`, customers use different wire formats:
- **SAP IDoc (DELVRY03, SHPMNT04)** — Heubach, Clariant, etc.
- **Odyssey XML (native)** — Ascensus, Polyvantis
- **EDIFACT** — European EDI standard (PRODAT, PARTIN, IFTMIN, DESADV, etc.)
- **CIDX** — Chemical industry XML standard
- **SAP HANA XML** — Newer SAP format
- **SAP R/3 XML** — Older SAP format
- **X12 EDI** — North American EDI (210, 214, 219, 220, 810)
- **Flat files** — CSV/fixed-width

---

## 7. Key Findings So Far

### 7.1 Heubach (analyzed by Thomas with Kiro)
- **SAP IDoc-heavy** — processes `DELVRY03` (delivery) and `SHPMNT04` (shipment) IDocs
- **4 JMS translator services** (TranslatorIn, TranslatorIn2, TranslatorOut, TranslatorOutWIN)
- **18 XSL stylesheets** in HeubachTranslator/ folder
- Complex carrier SCAC assignment logic (13+ priority rules for rail, air, ground, parcel)
- Transport mode derivation from SAP VSBED codes (~30 mappings)
- Dual output paths: TMS (international) vs WIN (domestic ground)
- Legacy `To.xsl` references `*CLARIANT_SYS_01` — Heubach's gateway was likely cloned from Clariant's
- **FreightCostAllocation** outputs a proprietary `FreightInvoiceTransaction` XML (not standard)

### 7.2 Ascensus (analyzed by Thomas with Kiro)
- **No SAP IDoc layer** — uses OLT-native XML directly (much simpler)
- **Dual-region architecture** — two parallel translator stacks (NA and EUR) with separate XSL sets
- 7 custom XSL files across two folders (`AscensusTranslator/` and `AscensusTranslatorEUR/`)
- Key delta: `ShippedFlag` — NA hardcodes `Yes` (auto-confirmed), EUR hardcodes `No` (requires separate confirmation)
- `Ss.xsl` is a pure geographic filter: NA keeps US/CA/MX, EUR keeps everything else
- `Si.xsl` always emits all 10 hazmat fields even when blank (chemical shipping profile)
- Simpler than Heubach — good baseline for understanding the "minimum" gateway

### 7.3 GRACE & GCP — shared gateways
These customers don't have their own folders — they're embedded in Hubspan, KleinschmidtGateway, CNSender, and CarrierEMEA. This means the team's assumption that every customer = one folder is not always true. Some customers are "tenants" inside shared translation gateways.

---

## 8. Team & Roles

| Person | Role | What to ask them |
|---|---|---|
| **Nirab** | Odyssey VP | Strategic direction, priority decisions |
| **David Johns** | Manager | Project scope, business context, stakeholder alignment |
| **Thomas Quaile** | Principal Architect | Repo content, gateway technical details, POC customer selection |
| **Devin Gilmore** | Director, Digital Integrations | Production gateway access, which customers have custom gateways, SharePoint zips |
| **Hemalatha Rambabu** | Team member (Cognizant) | Invoice/PDF mapping analysis (her parallel workstream) |
| **Dave Schultz** | Team member | Team coordination |
| **Ronald** | Gateway SME | Deep technical questions about specific customer gateways, operational behavior |
| **Laurie** | Stakeholder management | Cross-team blockers — "forces answers out of somebody" |
| **Efrain** | Developer (other team) | Order integration (Phase 2) |

---

## 9. Glossary

| Term | Definition |
|---|---|
| **BOL** | Bill of Lading — shipping document identifying carrier, shipper, consignee, and freight |
| **Boomi** | Dell Boomi — modern iPaaS (integration platform) replacing the legacy Gateway |
| **CIDX** | Chemical Industry Data Exchange — XML standard for chemical supply chain |
| **D365** | Microsoft Dynamics 365 — ERP system some customers use |
| **DOCTYPE** | Numeric message type identifier used in routing rules (e.g., 129 = PlannedShipment) |
| **EDIFACT** | Electronic Data Interchange for Administration, Commerce and Transport — international EDI standard |
| **ERP** | Enterprise Resource Planning — customer's business system (SAP, Oracle, D365, etc.) |
| **GtwUtils** | Gateway utility Java class providing database lookups and writes from within XSLTs |
| **IDoc** | SAP Intermediate Document — SAP's standard XML message format (e.g., DELVRY03, SHPMNT04) |
| **JMS** | Java Message Service — message queue protocol used between Gateway services |
| **Kiro** | Amazon's AI coding tool — what Thomas used to generate mapping rules reports |
| **L2B** | Loads to BOLs — process of converting planned shipment loads into executed bills of lading |
| **NN / NNCode** | Odyssey platform version identifier (e.g., NN23010PROD.13) |
| **OLT** | Odyssey Logistics Technology — the platform |
| **PGI** | Post-Goods-Issued — customer's confirmation that product was picked, packed, and loaded |
| **SCAC** | Standard Carrier Alpha Code — 2-4 letter carrier identifier (e.g., BNSF, FDEG) |
| **SOURCEID** | Customer identifier in routing rules (e.g., 'HEUBACH', 'ASCENSUS', 'GRACE') |
| **SysConfig** | `SysConfig.xml` — the main configuration file for each gateway instance |
| **TMS** | Transportation Management System — Odyssey's core system for shipment planning and execution |
| **VSBED** | SAP shipping condition code — drives transport mode and equipment type derivation |
| **X12** | ANSI ASC X12 — North American EDI standard (transaction sets: 210, 214, 810, etc.) |
| **XSL/XSLT** | Extensible Stylesheet Language Transformations — XML-based language for transforming XML documents |
| **WIN** | Odyssey's domestic rating/routing system (receives TransportationRequests for ground shipments) |
