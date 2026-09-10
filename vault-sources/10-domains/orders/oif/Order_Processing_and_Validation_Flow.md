**Order Processing and Validation Flow**

Error Resolution — Design Decision

# **1. Executive Summary**

The Order Application receives Integrated Orders from external systems in **IntegratedOrder** JSON format and Manual Orders from the application UI in **OrderIn** JSON format. OrderIn is the application's native order format.

**Current Order Intake**

| **Order Type** | **Source** | **Payload Format** | **Processing Note** |
| --- | --- | --- | --- |
| Integrated Order | External systems | IntegratedOrder JSON | Requires Level 1 validation before transformation to OrderIn. |
| Manual Order | Application UI | OrderIn JSON | Already uses the application's native format and enters the OrderIn validation flow. |

Integrated Orders pass through two validation levels.

**Level 1** validates whether the incoming message is **structurally complete and internally consistent enough** to be transformed.

**Level 2** validates the transformed OrderIn message **against master data**.

**End-to-End Processing Flow**

|  |  |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **STEP 1**  **Receive**  **IntegratedOrder** | **▶** | **STEP 2**  **Level 1**  **Pre-Condition** | **▶** | **STEP 3**  **Transform**  **to OrderIn** | **▶** | **STEP 4**  **Level 2**  **Master Data** | **▶** | **STEP 5**  **Persist to**  **OrderInfo** |

■ Intake ■ Validation ■ Transformation ■ Persistence

# **2. Validation Flow**

## **2.1 Level 1: Pre-Condition Validation**

The purpose of Pre-Condition Validation is to identify structural and data-consistency issues in the IntegratedOrder message before transformation. The checks include:

* Data-format validation.
* Mandatory-field validation.
* Consistency checks across order lines.
* Validation of Shipper information across all order lines.
* Validation of Ship-To information across all order lines.
* Any additional checks required to ensure that the IntegratedOrder JSON can be successfully transformed into the native OrderIn format.

|  |
| --- |
| **Level 1 Failure Outcome**  Store the IntegratedOrder message in **order\_interface\_staging** and mark the order status as ERROR. |

## **2.2 Level 2: Master Data Validation**

After all Level 1 validations pass, the IntegratedOrder JSON is transformed into OrderIn JSON. Field-level validations are then performed against the Master Database to confirm that referenced values are valid and exist in the corresponding master data records.

|  |
| --- |
| **Level 2 Failure Outcome**  Store the OrderIn message in **order\_staging** and mark the order status as ERROR. |

## **2.3 Successful Order Creation**

|  |
| --- |
| **Success Outcome**  If both validation levels pass, the order is considered valid and the final order persisted in the **order\_info** table. |

## **2.4 Current Gap**

The current error-resolution UI supports Level 2 errors only, leaving a functional gap for Level 1 errors.

|  |
| --- |
| **Decision Required**  Select an error-resolution approach for Level 1 failures:  (1) introduce a separate IntegratedOrder correction screen  (2) transform invalid Level 1 values to null and resolve them through the existing OrderIn error-resolution screen. |

# **3. Problem Statement**

Users require a mechanism to resolve errors raised at both validation levels:

| **Level** | **Error Point** | **Current Resolution Capability** |
| --- | --- | --- |
| Level 1 | IntegratedOrder validation and transformation pre-conditions | Not supported by the existing screen because OrderIn has not yet been created. |
| Level 2 | OrderIn field validation against master data | Supported by the existing error-resolution screen. |

The existing UI was designed for Level 2 errors. It cannot directly resolve Level 1 errors because the transformation from IntegratedOrder to OrderIn does not complete when a Pre-Condition Validation fails.

# **4. Proposal 1: Separate Level 1 Error-Resolution Screen**

Design a dedicated screen for correcting errors raised during Level 1 validation in the IntegratedOrder payload.

1. Display the failed IntegratedOrder message and its Level 1 validation errors.
2. Re-run Level 1 validation after correction.
3. Transform the corrected IntegratedOrder into OrderIn JSON.
4. Use the existing Level 2 screen if Master Data Validation subsequently fails.

## **4.1 Key Implications**

* Maintains a clear separation between source-message correction and native-order correction.
* Potentially introduces a two-screen user journey when an order fails at both levels.
* Preserves invalid source values until the user explicitly corrects them.

# **5. Proposal 2: Convert Invalid Values to Null**

During the **IntegratedOrder**-to-**OrderIn** transformation, values identified as invalid by Level 1 validation would be set to **null** instead of stopping transformation. The user would then enter valid values in the existing **OrderIn error-resolution** screen.

1. Run Level 1 validation and identify invalid or inconsistent values.
2. Replace the affected target values with **null** during transformation.
3. Create the OrderIn payload and route it to the existing error-resolution flow.
4. Allow the user to supply valid values in the existing UI.
5. Re-run the applicable validations before order creation.

## **5.1 Key Implications**

* Reuses the existing error-resolution screen and provides a single correction experience.
* **Requires an explicit mapping** of each Level 1 exception to the target field or fields that will be set to null.
* May remove the invalid source value from the editable OrderIn representation unless the original IntegratedOrder and error context remain available.
* Requires clear handling for failures that prevent transformation entirely, such as malformed structure or missing data needed to construct OrderIn.

# **6. Comparative Decision Matrix**

| **Decision Criterion** | **Proposal 1: Separate Screen** | **Proposal 2: Null and Reuse Existing Screen** |
| --- | --- | --- |
| User experience | Two-stage correction journey; the screen matches the payload being corrected. | Single correction screen; users work only with OrderIn fields. |
| Technical separation | Keeps Level 1 and Level 2 responsibilities separate. | Combines correction into the OrderIn flow, while Level 1 detection remains upstream. |
| Source-data preservation | Original invalid values remain visible for correction and audit. | Original payload must be retained separately to avoid losing error context. |
| Transformation feasibility | Works when the payload can be loaded and edited, even if it cannot yet be transformed. | Applicable only where a usable OrderIn can still be constructed after invalid values are nullified. |
| Implementation scope | New UI, APIs, permissions, validation display, save, and reprocessing behavior. | Enhancements to transformation, error mapping, UI field handling, and revalidation behavior. |
| Operational support | Two staging tables and two resolution paths remain explicit. | A unified UI may simplify support, but error lineage must remain clear. |
| Risk to data meaning | Lower risk of silently changing invalid input before user correction. | Higher risk if null is interpreted as genuinely absent rather than invalid or unresolved. |
| Extensibility | Supports Level 1-specific rules and payload structures directly. | Efficient where most Level 1 errors map cleanly to editable OrderIn fields. |

# **7. Suggested Design Direction**

|  |
| --- |
| **Recommended Decision Principle**  Do not use null substitution as a universal solution. First classify Level 1 validations into errors that prevent transformation and errors that can be mapped safely to editable OrderIn fields. |

Based on the supplied flow, a hybrid decision is the most defensible review option:

* Use a Level 1 resolution capability for structural, cross-line, or identity-consistency failures that prevent a reliable OrderIn payload from being constructed.
* Consider routing field-level, safely mappable issues to the existing Level 2 screen only when the original value, validation message, source path, and target field remain traceable.
* Do not replace a value with null unless the system can distinguish "missing in source" from "invalid and awaiting correction."
* Re-run the complete applicable validation chain after correction before persisting to OrderInfo.

This direction is a design recommendation for review, not a confirmed implementation decision. The final choice should be validated against the detailed Level 1 rule list, the existing UI field model, transformation constraints, and audit requirements.