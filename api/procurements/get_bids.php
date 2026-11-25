<?php

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

/**
 * @param mysqli   $conn          Active MySQLi database connection.
 * @param int|null $procurementId Optional procurement filter.
 * @return array Array of bids with connected project titles and ABC values.
 */
function fetchBidList($conn, $procurementId = null) {
    $sql = '
        SELECT 
            b.id,
            b.procurement_id,
            b.bidder_name,
            b.company_name,
            b.company_name AS representative_name,
            b.bid_amount,
            b.remarks,
            b.status,
            b.submitted_at,
            b.submitted_at AS created_at,
            p.reference_no AS procurement_reference,
            p.reference_no,
            p.title AS procurement_title,
            p.abc AS procurement_abc,
            p.status AS procurement_status,
            (p.abc - b.bid_amount) AS potential_savings
        FROM bids b
        JOIN procurements p ON b.procurement_id = p.id
    ';

    if ($procurementId) {
        $sql .= ' WHERE b.procurement_id = ? ';
    }

    $sql .= ' ORDER BY b.submitted_at DESC, b.bid_amount ASC ';

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        sendError('SQL prepare failed: ' . $conn->error, null, 500);
    }

    if ($procurementId) {
        $stmt->bind_param('i', $procurementId);
    }

    $stmt->execute();
    $result = $stmt->get_result();
    $bids = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    foreach ($bids as &$b) {
        $b['id']                = (int)$b['id'];
        $b['procurement_id']    = (int)$b['procurement_id'];
        $b['bid_amount']        = (float)$b['bid_amount'];
        $b['procurement_abc']   = (float)$b['procurement_abc'];
        $b['potential_savings'] = (float)$b['potential_savings'];
    }
    unset($b);

    return $bids;
}

//Establish database connection
$conn = getDbConnection();
$procurementId = filter_input(INPUT_GET, 'procurement_id', FILTER_VALIDATE_INT);
$bids = fetchBidList($conn, $procurementId);

sendSuccess('Submitted bidder quotations retrieved successfully.', [
    'count' => count($bids),
    'bids'  => $bids,
]);
