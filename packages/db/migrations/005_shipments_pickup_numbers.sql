-- 005: shipments.pickup_numbers (S104 R2-2). Pickup # is an ORDER-header
-- customer reference (from the customer ERP / SAP PGI-PGR flow) copied to the
-- load and the stop; a shipment consolidating N orders therefore carries N of
-- them — an ARRAY, exactly like shipments.orders, never a scalar. This is why
-- Jana could not find it as a shipment column: at shipment level it is not one.
ALTER TABLE shipments ADD COLUMN pickup_numbers text[] NOT NULL DEFAULT '{}';
