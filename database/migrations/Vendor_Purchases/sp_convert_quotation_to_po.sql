DELIMITER //

CREATE PROCEDURE sp_convert_quotation_to_po(
    IN p_quotation_id INT,
    IN p_user_id INT,
    OUT p_po_id INT
)
BEGIN
    DECLARE v_vendor_id INT;
    DECLARE v_currency_id INT;
    DECLARE v_exchange_rate DECIMAL(15,6);
    DECLARE v_status VARCHAR(50);
    DECLARE v_pending_count INT;
    DECLARE v_po_number VARCHAR(50);
    DECLARE v_new_po_id INT;
    
    -- Error Handler
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- 1. Validate Quotation
    SELECT status, vendor_id, currency_id, exchange_rate
    INTO v_status, v_vendor_id, v_currency_id, v_exchange_rate
    FROM purchase_quotations
    WHERE id = p_quotation_id
    FOR UPDATE;

    IF v_status != 'approved' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Only approved quotations can be converted.';
    END IF;

    -- Check if there are pending items
    SELECT COUNT(*) INTO v_pending_count
    FROM purchase_quotation_items
    WHERE quotation_id = p_quotation_id
    AND (quantity - converted_quantity) > 0;

    IF v_pending_count = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'All items in this quotation have already been converted.';
    END IF;

    -- 2. Create Purchase Order Header
    SET v_po_number = CONCAT('PO-', UNIX_TIMESTAMP());
    
    INSERT INTO purchase_orders (
        order_number, supplier_id, quotation_id, currency_id, exchange_rate,
        order_date, status, priority, created_by, created_at, updated_at
    ) VALUES (
        v_po_number, v_vendor_id, p_quotation_id, v_currency_id, v_exchange_rate,
        CURRENT_DATE(), 'draft', 'medium', p_user_id, NOW(), NOW()
    );
    
    SET v_new_po_id = LAST_INSERT_ID();
    SET p_po_id = v_new_po_id;

    -- 3. Copy Items (Fully convert remaining quantities)
    INSERT INTO purchase_order_items (
        order_id, quotation_item_id, product_id, service_id,
        item_code, item_name_ar, item_name_en, description_ar, description_en,
        quantity, unit_id, unit_price, discount_percent, discount_amount,
        tax_id, tax_amount, delivery_date, warehouse_id,
        cost_center_id, project_id
    )
    SELECT 
        v_new_po_id, id, product_id, service_id,
        item_code, item_name_ar, item_name_en, description_ar, description_en,
        (quantity - converted_quantity), unit_id, unit_price, discount_percent, discount_amount,
        tax_id, tax_amount, promised_delivery_date, warehouse_id,
        cost_center_id, project_id
    FROM purchase_quotation_items
    WHERE quotation_id = p_quotation_id
    AND (quantity - converted_quantity) > 0;

    -- 4. Update Converted Quantities in Quotation Items
    UPDATE purchase_quotation_items
    SET converted_quantity = quantity
    WHERE quotation_id = p_quotation_id;

    -- 5. Update Quotation Status
    UPDATE purchase_quotations
    SET status = 'converted_to_po',
        converted_to_po_id = v_new_po_id,
        converted_date = CURRENT_DATE()
    WHERE id = p_quotation_id;
    
    -- 6. Recalculate PO Totals (Simplified)
    -- Logic to sum up line_total, tax_total, etc. would go here or rely on triggers/app logic
    
    COMMIT;
END //

DELIMITER ;
