<?php

$host     = 'localhost';
$username = 'root';
$password = ''; // huwag muna
$database = 'chr_procurement';

/**

 * @return mysqli Active MySQLi connection object.
 */


function getDbConnection() {
    global $host, $username, $password, $database;

    static $conn = null;

    if ($conn === null) {
        try {
            $conn = new mysqli($host, $username, $password, $database);
        } catch (mysqli_sql_exception $e) {
            error_log('Database connection failed: ' . $e->getMessage());
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'success' => false,
                'message' => 'Database connection failed. Please ensure MySQL is running and the chr_procurement database has been created.',
                'data'    => null
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        //Check if connection failed
        if ($conn->connect_error) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'success' => false,
                'message' => 'Database connection failed. Please ensure MySQL is running.',
                'data'    => null
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Set utf8mb4 charset to match database collation
        $conn->set_charset('utf8mb4');
    }

    return $conn;
}

/**

 * @return mysqli Active MySQLi connection object.
 */
function connectDatabase() {
    return getDbConnection();
}
