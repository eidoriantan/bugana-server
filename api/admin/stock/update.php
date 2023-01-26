<?php

require_once '../../../vendor/autoload.php';
require_once '../../../includes/config.php';
require_once '../../../includes/database.php';
require_once '../../../includes/utils.php';

use Firebase\JWT\JWT;
use Firebase\JWT\SignatureInvalidException;
use Firebase\JWT\BeforeValidException;
use Firebase\JWT\ExpiredException;
use Firebase\JWT\Key;

header('Content-Type: application/json');
cors();

$result = [
  'success' => false,
  'message' => 'Invalid request'
];

if (!empty($_POST['token'])) {
  $decoded = null;
  $id = $conn->real_escape_string($_POST['id']);
  $quantity = $conn->real_escape_string($_POST['quantity']);

  try {
    $decoded = JWT::decode($_POST['token'], new Key(JWT_KEY, JWT_ALGO));
  } catch (InvalidArgumentException $e) {
    $result['message'] = 'Invalid token';
  } catch (SignatureInvalidException $e)  {
    $result['message'] = 'Invalid signature';
  } catch (BeforeValidException $e) {
    $result['message'] = 'Token is no longer valid';
  } catch (ExpiredException $e) {
    $result['message'] = 'Token already expired';
  }

  if ($decoded !== null) {
    $usertype = $decoded->type;
    if ($usertype === 'admin' || $usertype === 'headadmin') {
      $stocks_res = $conn->query("SELECT * FROM stocks WHERE id=$id LIMIT 1");
      if ($stocks_res->num_rows > 0) {
        $conn->query("UPDATE stocks SET quantity=$quantity WHERE id=$id");
        $result['success'] = true;
        $result['message'] = '';
      } else {
        $result['message'] = 'Stock does not exist';
      }
    } else {
      $result['message'] = 'User is not admin';
    }
  }
}

echo json_encode($result);

?>
