<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Nutribite - Home</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <header>
      <nav>
        <h1>Nutribite</h1>
        <ul>
          <li><a href="index.php">Home</a></li>
          <li><a href="login.html">Login</a></li>
          <li><a href="cart.html">Payment & Order</a></li>
          <li><a href="notifications.html">Notifications & Receipts</a></li>
          <li><a href="comments-and-dietitians.html">Comments & Dietitians</a></li>
          <li><a href="calorie-calculator.html">Calorie Calculator</a></li>
          <li><a href="admin.html">Admin Dashboard</a></li>
          <li><a href="email-confirmation.html">Order Confirmation Email</a></li>
        </ul>
      </nav>
    </header>

    <div class="main-content">
      <section class="hero">
        <h2>Healthy Food Products</h2>
        <p>Choose from a variety of healthy and tasty products</p>
      </section>

      <section class="personal-account">
        <h2>Your Account</h2>
        <p>Welcome back, valued customer!</p>
        <p><a href="login.html" class="btn">Manage Your Account</a></p>
      </section>

      <section class="product-grid">
        <div>
          <p>Products in Order: <span id="order-count">0</span></p>
        </div>

        <?php
        // התחברות למסד נתונים
        $servername = "localhost";
        $username = "root";
        $password = "";
        $dbname = "healthy_food"; // ודא שהשם תואם למסד שלך

        $conn = new mysqli($servername, $username, $password, $dbname);

        if ($conn->connect_error) {
          die("Connection failed: " . $conn->connect_error);
        }

        $sql = "SELECT * FROM products";
        $result = $conn->query($sql);

        if ($result->num_rows > 0) {
          while($row = $result->fetch_assoc()) {
            echo "<article class='product'>";
            echo "<img src='" . $row['image_url'] . "' alt='" . $row['name'] . "' />";
            echo "<h3>" . $row['name'] . "</h3>";
            echo "<p>Fresh and nutritious product.</p>";
            echo "<p class='price'>₪" . $row['price'] . "</p>";
            echo "<button class='btn add-to-order' data-product='" . $row['name'] . "' data-price='" . $row['price'] . "'>Add to Order</button>";
            echo "</article>";
          }
        } else {
          echo "<p>No products available.</p>";
        }

        $conn->close();
        ?>

      </section>

      <script>
        const orderCountElem = document.getElementById('order-count');
        let orderCount = 0;
        document.querySelectorAll('.add-to-order').forEach(button => {
          button.addEventListener('click', () => {
            orderCount++;
            orderCountElem.textContent = orderCount;
            alert(button.dataset.product + ' added to order.');
          });
        });
      </script>
    </div>

    <footer>
      <p>&copy; 2025 Healthy Eating Site</p>
    </footer>
  </body>
</html>
