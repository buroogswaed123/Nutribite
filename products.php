<?php
$servername = "localhost";
$username = "root"; 
$password = ""; 
$dbname = "healthy_food";

// יצירת חיבור
$conn = new mysqli($servername, $username, $password, $dbname);

// בדיקה
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// שאילתת שליפה
$sql = "SELECT * FROM products";
$result = $conn->query($sql);

// בדיקה אם יש תוצאות
if ($result->num_rows > 0) {
    // הדפסת כל מוצר
    while($row = $result->fetch_assoc()) {
        echo "<div class='product'>";
        echo "<img src='" . $row['image_url'] . "' alt='" . $row['name'] . "'>";
        echo "<h3>" . $row['name'] . "</h3>";
        echo "<p>₪" . $row['price'] . "</p>";
        echo "<button>Add to Order</button>";
        echo "</div>";
    }
} else {
    echo "No products available.";
}

$conn->close();
?>
