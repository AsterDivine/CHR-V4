<?php


require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

//Accept only post requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed. Use POST.', null, 405);
}

/**
 * @param mysqli $conn Active MySQLi database connection.
 * @param array  $data Input payload.
 * @return int Primary key ID of the newly inserted bid record.
 */
function createBidQuotation($conn, $data) {
    $procurementId = filter_var($data['procurement_id'] ?? null, FILTER_VALIDATE_INT);
    
    // Bidder name and company name
    $bidderName  = trim($data['bidder_name'] ?? $data['representative_name'] ?? '');
    $companyName = trim($data['company_name'] ?? $data['bidder_name'] ?? '');
    $bidAmount   = $data['bid_amount'] ?? null;
    $remarks     = trim($data['remarks'] ?? '');

    // Form field validation
    if (!$procurementId) {
        sendError('A valid procurement ID is required.', null, 422);
    }
    if (empty($bidderName)) {
        sendError('Bidder / Authorized Representative Name is required.', null, 422);
    }
    if (empty($companyName)) {
        sendError('Company / Supplier Name is required.', null, 422);
    }
    if (!is_numeric($bidAmount) || (float)$bidAmount <= 0) {
        sendError('Bid Quotation Amount must be a valid positive number.', null, 422);
    }

    $bidAmount = (float)$bidAmount;

    //Verify procurement and is open for bidding
    $stmt = $conn->prepare('SELECT id, reference_no, title, abc, status, deadline FROM procurements WHERE id = ? LIMIT 1');
    if (!$stmt) {
        sendError('SQL prepare error: ' . $conn->error, null, 500);
    }
    $stmt->bind_param('i', $procurementId);
    $stmt->execute();
    $result = $stmt->get_result();
    $procurement = $result->fetch_assoc();
    $stmt->close();

    if (!$procurement) {
        sendError('Procurement project not found.', null, 404);
    }

    //Bid sumission for open bids
    if ($procurement['status'] !== 'Open' && $procurement['status'] !== 'Published / Open') {
        sendError(sprintf('Cannot submit quotation: This procurement is currently "%s" (must be "Open").', $procurement['status']), null, 422);
    }

    $conn->begin_transaction();

    try {
        $insertStmt = $conn->prepare('
            INSERT INTO bids (
                procurement_id,
                bidder_name,
                company_name,
                bid_amount,
                remarks,
                status,
                submitted_at
            ) VALUES (?, ?, ?, ?, ?, "Submitted", NOW())
        ');
        if (!$insertStmt) {
            throw new Exception('SQL prepare error for bids: ' . $conn->error);
        }

        $insertStmt->bind_param(
            'issds',
            $procurementId,
            $bidderName,
            $companyName,
            $bidAmount,
            $remarks
        );
        $insertStmt->execute();
        $bidId = (int)$conn->insert_id;
        $insertStmt->close();

        $action = 'Bid Submitted';
        $newVal = number_format($bidAmount, 2);
        $histRemarks = sprintf('Quotation of PHP %s submitted by "%s" (%s).', number_format($bidAmount, 2), $companyName, $bidderName);

        $histStmt = $conn->prepare('
            INSERT INTO transaction_history (
                procurement_id,
                action,
                old_value,
                new_value,
                remarks,
                created_at
            ) VALUES (?, ?, NULL, ?, ?, NOW())
        ');
        if (!$histStmt) {
            throw new Exception('SQL prepare error for history: ' . $conn->error);
        }

        $histStmt->bind_param('isss', $procurementId, $action, $newVal, $histRemarks);
        $histStmt->execute();
        $histStmt->close();

        $conn->commit();

        return $bidId;
    } catch (Exception $e) {
        $conn->rollback();
        sendError('Failed to record bid submission: ' . $e->getMessage(), null, 500);
    }
}

//Establish database connection
$conn = getDbConnection();
$input = getJsonInput();
$newBidId = createBidQuotation($conn, $input);

sendSuccess('Price quotation submitted successfully.', [
    'bid_id' => $newBidId,
], 201);
