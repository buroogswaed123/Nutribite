<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Payment and Order</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <header>
    <nav>
      <h1>Healthy Eating</h1>
      <ul>
        <li><a href="index.html">Home</a></li>
        <li><a href="login.html">Login</a></li>
        <li><a href="cart.html">Payment &amp; Order</a></li>
        <li><a href="notifications.html">Notifications &amp; Receipts</a></li>
      </ul>
    </nav>
  </header>

  <section class="order-summary">
    <h2>Order Summary</h2>
    <p>Vegetable Salad - ₪25</p>
    <p>Organic Granola - ₪18</p>
    <p><strong>Total: ₪43</strong></p>
  </section>

  <section class="payment-details">
    <h3>Payment Details</h3>
    <p>Only PayPal payment is accepted. Please proceed with PayPal.</p>
    <form id="paypal-form">
      <div id="paypal-button-container"></div>
    </form>
    <script src="https://www.paypal.com/sdk/js?client-id=sb&currency=USD"></script>
    <script>
      paypal.Buttons({
        createOrder: function(data, actions) {
          return actions.order.create({
            purchase_units: [{
              amount: {
                value: '43.00' // Total amount from order summary
              }
            }]
          });
        },
        onApprove: function(data, actions) {
          return actions.order.capture().then(function(details) {
            alert('Transaction completed by ' + details.payer.name.given_name + '!');
            // You can add further actions here, like redirecting to a confirmation page
          });
        }
      }).render('#paypal-button-container');
    </script>
  </section>

  <section class="delivery-status">
    <h3>Order Delivery Status</h3>
    <p>Your order is being processed and will be delivered within 3-5 business days.</p>
    <p>Track your order with the tracking number sent to your email.</p>
  </section>

  <section class="email-confirmation">
    <h3>Order Confirmation Email</h3>
    <p>Dear Customer,</p>
    <p>Thank you for your order! This email confirms that your order has been received and is being processed.</p>
    <p>You will receive another email once your order has been shipped.</p>
    <p>Order Details:</p>
    <ul>
      <li>Vegetable Salad - ₪25</li>
      <li>Organic Granola - ₪18</li>
      <li><strong>Total: ₪43</strong></li>
    </ul>
    <p>Thank you for choosing Nutribite!</p>
  </section>

  <footer>
    <p>&copy; 2025 Healthy Eating Site</p>
  </footer>
</body>
</html>
