-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 09, 2025 at 01:03 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `customer`
--

-- --------------------------------------------------------

--
-- Table structure for table `belongsto`
--

CREATE TABLE `belongsto` (
  `ProductID` int(11) NOT NULL,
  `CategoryID` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `CategoryID` int(11) NOT NULL,
  `CategoryName` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `contains`
--

CREATE TABLE `contains` (
  `ProductID` int(11) NOT NULL,
  `IngredientID` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `ID` varchar(10) NOT NULL,
  `Name` varchar(100) DEFAULT NULL,
  `Address` varchar(255) DEFAULT NULL,
  `Email` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `customers`
--

INSERT INTO `customers` (`ID`, `Name`, `Address`, `Email`) VALUES
('123456789', 'John Doe', '123 Main Street', 'john.doe@email.com');

-- --------------------------------------------------------

--
-- Table structure for table `delivery`
--

CREATE TABLE `delivery` (
  `DeliveryID` int(11) NOT NULL,
  `Address` varchar(255) DEFAULT NULL,
  `DeliveryDate` date DEFAULT NULL,
  `PaymentDetails` text DEFAULT NULL,
  `OrderID` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `feedback`
--

CREATE TABLE `feedback` (
  `FeedbackID` int(11) NOT NULL,
  `CustomerID` varchar(10) DEFAULT NULL,
  `Rating` int(11) DEFAULT NULL,
  `Comment` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `feedback`
--

INSERT INTO `feedback` (`FeedbackID`, `CustomerID`, `Rating`, `Comment`) VALUES
(1, '123456789', 5, 'Great service and fast delivery!');

-- --------------------------------------------------------

--
-- Table structure for table `feedback1`
--

CREATE TABLE `feedback1` (
  `ישראל` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `includes`
--

CREATE TABLE `includes` (
  `OrderID` int(11) NOT NULL,
  `ProductID` int(11) NOT NULL,
  `IncludeDate` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ingredients`
--

CREATE TABLE `ingredients` (
  `IngredientID` int(11) NOT NULL,
  `IngredientName` varchar(100) DEFAULT NULL,
  `Type` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `nutritionplans`
--

CREATE TABLE `nutritionplans` (
  `PlanID` int(11) NOT NULL,
  `PlanContent` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `OrderID` int(11) NOT NULL,
  `CustomerID` varchar(10) DEFAULT NULL,
  `OrderDate` date DEFAULT NULL,
  `OrderStatus` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`OrderID`, `CustomerID`, `OrderDate`, `OrderStatus`) VALUES
(1, '123456789', '2025-05-09', 'Processing');

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `ProductID` int(11) NOT NULL,
  `ProductName` varchar(100) DEFAULT NULL,
  `Description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `schedules`
--

CREATE TABLE `schedules` (
  `CustomerID` varchar(10) NOT NULL,
  `ProductID` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `belongsto`
--
ALTER TABLE `belongsto`
  ADD PRIMARY KEY (`ProductID`,`CategoryID`),
  ADD KEY `CategoryID` (`CategoryID`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`CategoryID`);

--
-- Indexes for table `contains`
--
ALTER TABLE `contains`
  ADD PRIMARY KEY (`ProductID`,`IngredientID`),
  ADD KEY `IngredientID` (`IngredientID`);

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`ID`);

--
-- Indexes for table `delivery`
--
ALTER TABLE `delivery`
  ADD PRIMARY KEY (`DeliveryID`),
  ADD KEY `OrderID` (`OrderID`);

--
-- Indexes for table `feedback`
--
ALTER TABLE `feedback`
  ADD PRIMARY KEY (`FeedbackID`),
  ADD KEY `CustomerID` (`CustomerID`);

--
-- Indexes for table `includes`
--
ALTER TABLE `includes`
  ADD PRIMARY KEY (`OrderID`,`ProductID`),
  ADD KEY `ProductID` (`ProductID`);

--
-- Indexes for table `ingredients`
--
ALTER TABLE `ingredients`
  ADD PRIMARY KEY (`IngredientID`);

--
-- Indexes for table `nutritionplans`
--
ALTER TABLE `nutritionplans`
  ADD PRIMARY KEY (`PlanID`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`OrderID`),
  ADD KEY `CustomerID` (`CustomerID`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`ProductID`);

--
-- Indexes for table `schedules`
--
ALTER TABLE `schedules`
  ADD PRIMARY KEY (`CustomerID`,`ProductID`),
  ADD KEY `ProductID` (`ProductID`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `belongsto`
--
ALTER TABLE `belongsto`
  ADD CONSTRAINT `belongsto_ibfk_1` FOREIGN KEY (`ProductID`) REFERENCES `products` (`ProductID`),
  ADD CONSTRAINT `belongsto_ibfk_2` FOREIGN KEY (`CategoryID`) REFERENCES `categories` (`CategoryID`);

--
-- Constraints for table `contains`
--
ALTER TABLE `contains`
  ADD CONSTRAINT `contains_ibfk_1` FOREIGN KEY (`ProductID`) REFERENCES `products` (`ProductID`),
  ADD CONSTRAINT `contains_ibfk_2` FOREIGN KEY (`IngredientID`) REFERENCES `ingredients` (`IngredientID`);

--
-- Constraints for table `delivery`
--
ALTER TABLE `delivery`
  ADD CONSTRAINT `delivery_ibfk_1` FOREIGN KEY (`OrderID`) REFERENCES `orders` (`OrderID`);

--
-- Constraints for table `feedback`
--
ALTER TABLE `feedback`
  ADD CONSTRAINT `feedback_ibfk_1` FOREIGN KEY (`CustomerID`) REFERENCES `customers` (`ID`);

--
-- Constraints for table `includes`
--
ALTER TABLE `includes`
  ADD CONSTRAINT `includes_ibfk_1` FOREIGN KEY (`OrderID`) REFERENCES `orders` (`OrderID`),
  ADD CONSTRAINT `includes_ibfk_2` FOREIGN KEY (`ProductID`) REFERENCES `products` (`ProductID`);

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`CustomerID`) REFERENCES `customers` (`ID`);

--
-- Constraints for table `schedules`
--
ALTER TABLE `schedules`
  ADD CONSTRAINT `schedules_ibfk_1` FOREIGN KEY (`CustomerID`) REFERENCES `customers` (`ID`),
  ADD CONSTRAINT `schedules_ibfk_2` FOREIGN KEY (`ProductID`) REFERENCES `products` (`ProductID`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
