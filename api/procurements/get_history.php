<?php

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

/**
 * @param mysqli   $conn          Active MySQLi database connection.
 * @param int|null $procurementId Optional procurement filter.
 * @return array Array of transaction audit entries.
 */

function fetchTransactionHistoryLogs($conn, $procurementId = null) {
    $sql = '
        SELECT 
            h.id,
            h.procurement_id,
            h.action,
            h.old_value,
            h.new_value,
            h.old_value AS previous_status,
            h.new_value AS new_status,
            h.remarks,
            h.created_at,
            p.reference_no AS procurement_reference,
            p.reference_no,
            p.title AS procurement_title
        FROM transaction_history h
        JOIN procurements p ON h.procurement_id = p.id
    ';

    if ($procurementId) {
        $sql .= ' WHERE h.procurement_id = ? ';
    }

    $sql .= ' ORDER BY h.created_at DESC, h.id DESC LIMIT 100 ';

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        sendError('SQL prepare failed: ' . $conn->error, null, 500);
    }

    if ($procurementId) {
        $stmt->bind_param('i', $procurementId);
    }

    $stmt->execute();
    $result = $stmt->get_result();
    $logs = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    foreach ($logs as &$log) {
        $log['id']             = (int)$log['id'];
        $log['procurement_id'] = (int)$log['procurement_id'];
    }
    unset($log);

    return $logs;
}

//Establish database connection
$conn = getDbConnection();
$procurementId = filter_input(INPUT_GET, 'procurement_id', FILTER_VALIDATE_INT);
$logs = fetchTransactionHistoryLogs($conn, $procurementId);

sendSuccess('Transaction history retrieved successfully.', [
    'count' => count($logs),
    'logs'  => $logs,
]);
