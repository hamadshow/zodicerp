-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: srv535.hstgr.io    Database: u244683233_Zodicerp
-- ------------------------------------------------------
-- Server version	11.8.3-MariaDB-log

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `accounts`
--

DROP TABLE IF EXISTS `accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `accounts` (
  `AccID` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `AccCode` int(11) NOT NULL,
  `AccName` varchar(50) NOT NULL,
  `AccType` tinyint(4) DEFAULT NULL,
  `AccParent` decimal(18,0) DEFAULT NULL,
  `AccDmType` tinyint(4) DEFAULT NULL,
  `AccFinal` tinyint(4) DEFAULT NULL,
  `AccMaxLimt` int(11) DEFAULT NULL,
  `AccMaxDuration` smallint(6) DEFAULT NULL,
  `AccBranch` tinyint(4) DEFAULT NULL,
  `AddUser` tinyint(4) DEFAULT NULL,
  `AddDate` date DEFAULT NULL,
  `EditUser` tinyint(4) DEFAULT NULL,
  `EditDate` date DEFAULT NULL,
  `NumOfEdit` tinyint(4) NOT NULL DEFAULT 0,
  `AccStopped` tinyint(1) NOT NULL DEFAULT 0,
  `AccNote` longtext DEFAULT NULL,
  PRIMARY KEY (`AccID`),
  UNIQUE KEY `accounts_acccode_unique` (`AccCode`),
  KEY `accounts_accparent_index` (`AccParent`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accounts`
--

LOCK TABLES `accounts` WRITE;
/*!40000 ALTER TABLE `accounts` DISABLE KEYS */;
/*!40000 ALTER TABLE `accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ads`
--

DROP TABLE IF EXISTS `ads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ads` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(191) NOT NULL,
  `expired_at` datetime DEFAULT NULL,
  `location` varchar(120) DEFAULT NULL,
  `key` varchar(120) NOT NULL,
  `image` varchar(191) DEFAULT NULL,
  `url` varchar(191) DEFAULT NULL,
  `clicked` bigint(20) NOT NULL DEFAULT 0,
  `order` int(11) NOT NULL DEFAULT 0,
  `status` varchar(60) NOT NULL DEFAULT 'published',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `open_in_new_tab` tinyint(1) NOT NULL DEFAULT 1,
  `tablet_image` varchar(191) DEFAULT NULL,
  `mobile_image` varchar(191) DEFAULT NULL,
  `ads_type` varchar(191) DEFAULT NULL,
  `google_adsense_slot_id` varchar(191) DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ads`
--

LOCK TABLES `ads` WRITE;
/*!40000 ALTER TABLE `ads` DISABLE KEYS */;
/*!40000 ALTER TABLE `ads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `areas`
--

DROP TABLE IF EXISTS `areas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `areas` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `city_id` bigint(20) unsigned NOT NULL,
  `country_id` bigint(20) unsigned NOT NULL,
  `code` varchar(255) DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `areas_city_id_foreign` (`city_id`),
  KEY `areas_country_id_foreign` (`country_id`),
  CONSTRAINT `areas_city_id_foreign` FOREIGN KEY (`city_id`) REFERENCES `cities` (`id`) ON DELETE CASCADE,
  CONSTRAINT `areas_country_id_foreign` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `areas`
--

LOCK TABLES `areas` WRITE;
/*!40000 ALTER TABLE `areas` DISABLE KEYS */;
/*!40000 ALTER TABLE `areas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `asset_attributes`
--

DROP TABLE IF EXISTS `asset_attributes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `asset_attributes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `asset_id` bigint(20) unsigned NOT NULL,
  `attribute_id` bigint(20) unsigned NOT NULL,
  `value_text` varchar(500) DEFAULT NULL,
  `value_number` decimal(20,4) DEFAULT NULL,
  `value_date` date DEFAULT NULL,
  `value_boolean` tinyint(1) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `asset_attributes_asset_id_index` (`asset_id`),
  KEY `asset_attributes_attribute_id_index` (`attribute_id`),
  CONSTRAINT `asset_attributes_asset_id_foreign` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `asset_attributes_attribute_id_foreign` FOREIGN KEY (`attribute_id`) REFERENCES `attributes` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asset_attributes`
--

LOCK TABLES `asset_attributes` WRITE;
/*!40000 ALTER TABLE `asset_attributes` DISABLE KEYS */;
/*!40000 ALTER TABLE `asset_attributes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `asset_categories`
--

DROP TABLE IF EXISTS `asset_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `asset_categories` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `parent_id` bigint(20) unsigned DEFAULT NULL,
  `code` varchar(50) NOT NULL,
  `name_ar` varchar(100) NOT NULL,
  `name_en` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `depreciation_method` enum('straight_line','declining_balance','units_of_production') NOT NULL DEFAULT 'straight_line',
  `useful_life_years` decimal(10,2) NOT NULL,
  `salvage_value_rate` decimal(5,2) NOT NULL DEFAULT 0.00,
  `account_purchase_id` int(10) unsigned DEFAULT NULL,
  `account_depreciation_id` int(10) unsigned DEFAULT NULL,
  `account_accumulated_depreciation_id` int(10) unsigned DEFAULT NULL,
  `account_disposal_gain_id` int(10) unsigned DEFAULT NULL,
  `account_disposal_loss_id` int(10) unsigned DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `asset_categories_code_unique` (`code`),
  KEY `asset_categories_parent_id_foreign` (`parent_id`),
  KEY `asset_categories_is_active_index` (`is_active`),
  KEY `asset_categories_account_purchase_id_index` (`account_purchase_id`),
  KEY `asset_categories_account_depreciation_id_index` (`account_depreciation_id`),
  KEY `asset_categories_account_accumulated_depreciation_id_index` (`account_accumulated_depreciation_id`),
  KEY `asset_categories_account_disposal_gain_id_index` (`account_disposal_gain_id`),
  KEY `asset_categories_account_disposal_loss_id_index` (`account_disposal_loss_id`),
  CONSTRAINT `asset_categories_account_accumulated_depreciation_id_foreign` FOREIGN KEY (`account_accumulated_depreciation_id`) REFERENCES `accounts` (`AccID`) ON DELETE SET NULL,
  CONSTRAINT `asset_categories_account_depreciation_id_foreign` FOREIGN KEY (`account_depreciation_id`) REFERENCES `accounts` (`AccID`) ON DELETE SET NULL,
  CONSTRAINT `asset_categories_account_disposal_gain_id_foreign` FOREIGN KEY (`account_disposal_gain_id`) REFERENCES `accounts` (`AccID`) ON DELETE SET NULL,
  CONSTRAINT `asset_categories_account_disposal_loss_id_foreign` FOREIGN KEY (`account_disposal_loss_id`) REFERENCES `accounts` (`AccID`) ON DELETE SET NULL,
  CONSTRAINT `asset_categories_account_purchase_id_foreign` FOREIGN KEY (`account_purchase_id`) REFERENCES `accounts` (`AccID`) ON DELETE SET NULL,
  CONSTRAINT `asset_categories_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `asset_categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asset_categories`
--

LOCK TABLES `asset_categories` WRITE;
/*!40000 ALTER TABLE `asset_categories` DISABLE KEYS */;
/*!40000 ALTER TABLE `asset_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `asset_depreciation`
--

DROP TABLE IF EXISTS `asset_depreciation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `asset_depreciation` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `asset_id` bigint(20) unsigned NOT NULL,
  `fiscal_year` int(11) NOT NULL,
  `period_month` int(11) NOT NULL,
  `period_year` int(11) NOT NULL,
  `depreciation_date` date NOT NULL,
  `depreciation_amount` decimal(20,4) NOT NULL,
  `accumulated_depreciation` decimal(20,4) NOT NULL,
  `net_book_value_before` decimal(20,4) NOT NULL,
  `net_book_value_after` decimal(20,4) NOT NULL,
  `journal_entry_id` bigint(20) unsigned DEFAULT NULL,
  `is_posted` tinyint(1) NOT NULL DEFAULT 0,
  `posted_date` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_asset_period_depreciation` (`asset_id`,`period_month`,`period_year`),
  KEY `asset_depreciation_fiscal_year_index` (`fiscal_year`),
  KEY `asset_depreciation_period_year_index` (`period_year`),
  KEY `asset_depreciation_period_month_index` (`period_month`),
  KEY `asset_depreciation_journal_entry_id_foreign` (`journal_entry_id`),
  KEY `asset_depreciation_created_by_foreign` (`created_by`),
  CONSTRAINT `asset_depreciation_asset_id_foreign` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `asset_depreciation_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `asset_depreciation_journal_entry_id_foreign` FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asset_depreciation`
--

LOCK TABLES `asset_depreciation` WRITE;
/*!40000 ALTER TABLE `asset_depreciation` DISABLE KEYS */;
/*!40000 ALTER TABLE `asset_depreciation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `asset_disposals`
--

DROP TABLE IF EXISTS `asset_disposals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `asset_disposals` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `asset_id` bigint(20) unsigned NOT NULL,
  `disposal_date` date NOT NULL,
  `disposal_method` enum('sale','scrap','donation','loss','theft','exchange') NOT NULL,
  `net_book_value` decimal(20,4) NOT NULL,
  `accumulated_depreciation` decimal(20,4) NOT NULL,
  `original_cost` decimal(20,4) NOT NULL,
  `disposal_amount` decimal(20,4) DEFAULT NULL,
  `disposal_currency_id` bigint(20) unsigned DEFAULT NULL,
  `gain_loss_amount` decimal(20,4) DEFAULT NULL,
  `buyer_name` varchar(200) DEFAULT NULL,
  `buyer_contact` varchar(500) DEFAULT NULL,
  `invoice_number` varchar(100) DEFAULT NULL,
  `journal_entry_id` bigint(20) unsigned DEFAULT NULL,
  `is_posted` tinyint(1) NOT NULL DEFAULT 0,
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `approved_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `asset_disposals_asset_id_foreign` (`asset_id`),
  KEY `asset_disposals_disposal_currency_id_foreign` (`disposal_currency_id`),
  KEY `asset_disposals_journal_entry_id_foreign` (`journal_entry_id`),
  KEY `asset_disposals_created_by_foreign` (`created_by`),
  KEY `asset_disposals_approved_by_foreign` (`approved_by`),
  CONSTRAINT `asset_disposals_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `asset_disposals_asset_id_foreign` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `asset_disposals_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `asset_disposals_disposal_currency_id_foreign` FOREIGN KEY (`disposal_currency_id`) REFERENCES `currencies` (`id`) ON DELETE SET NULL,
  CONSTRAINT `asset_disposals_journal_entry_id_foreign` FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asset_disposals`
--

LOCK TABLES `asset_disposals` WRITE;
/*!40000 ALTER TABLE `asset_disposals` DISABLE KEYS */;
/*!40000 ALTER TABLE `asset_disposals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `asset_inspections`
--

DROP TABLE IF EXISTS `asset_inspections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `asset_inspections` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `asset_id` bigint(20) unsigned NOT NULL,
  `inspection_date` date NOT NULL,
  `inspector_name` varchar(200) DEFAULT NULL,
  `condition_before` enum('excellent','good','fair','poor','critical') DEFAULT NULL,
  `condition_after` enum('excellent','good','fair','poor','critical') DEFAULT NULL,
  `findings` text DEFAULT NULL,
  `recommendations` text DEFAULT NULL,
  `next_inspection_date` date DEFAULT NULL,
  `is_maintenance_required` tinyint(1) NOT NULL DEFAULT 0,
  `maintenance_id` bigint(20) unsigned DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `asset_inspections_asset_id_foreign` (`asset_id`),
  KEY `asset_inspections_maintenance_id_foreign` (`maintenance_id`),
  KEY `asset_inspections_created_by_foreign` (`created_by`),
  CONSTRAINT `asset_inspections_asset_id_foreign` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `asset_inspections_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `asset_inspections_maintenance_id_foreign` FOREIGN KEY (`maintenance_id`) REFERENCES `asset_maintenance` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asset_inspections`
--

LOCK TABLES `asset_inspections` WRITE;
/*!40000 ALTER TABLE `asset_inspections` DISABLE KEYS */;
/*!40000 ALTER TABLE `asset_inspections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `asset_maintenance`
--

DROP TABLE IF EXISTS `asset_maintenance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `asset_maintenance` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `asset_id` bigint(20) unsigned NOT NULL,
  `maintenance_type` enum('preventive','corrective','predictive','emergency') NOT NULL,
  `request_date` date NOT NULL,
  `schedule_date` date DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `completion_date` date DEFAULT NULL,
  `maintenance_code` varchar(50) DEFAULT NULL,
  `title_ar` varchar(200) NOT NULL,
  `title_en` varchar(200) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `assigned_to` varchar(200) DEFAULT NULL,
  `vendor_id` bigint(20) unsigned DEFAULT NULL,
  `estimated_cost` decimal(20,4) DEFAULT NULL,
  `actual_cost` decimal(20,4) DEFAULT NULL,
  `currency_id` bigint(20) unsigned DEFAULT NULL,
  `status` enum('pending','approved','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
  `priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  `findings` text DEFAULT NULL,
  `actions_taken` text DEFAULT NULL,
  `parts_replaced` text DEFAULT NULL,
  `next_maintenance_date` date DEFAULT NULL,
  `requested_by` bigint(20) unsigned DEFAULT NULL,
  `approved_by` bigint(20) unsigned DEFAULT NULL,
  `completed_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `asset_maintenance_maintenance_code_unique` (`maintenance_code`),
  KEY `asset_maintenance_asset_id_foreign` (`asset_id`),
  KEY `asset_maintenance_currency_id_foreign` (`currency_id`),
  KEY `asset_maintenance_vendor_id_foreign` (`vendor_id`),
  KEY `asset_maintenance_requested_by_foreign` (`requested_by`),
  KEY `asset_maintenance_approved_by_foreign` (`approved_by`),
  KEY `asset_maintenance_completed_by_foreign` (`completed_by`),
  CONSTRAINT `asset_maintenance_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `asset_maintenance_asset_id_foreign` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `asset_maintenance_completed_by_foreign` FOREIGN KEY (`completed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `asset_maintenance_currency_id_foreign` FOREIGN KEY (`currency_id`) REFERENCES `currencies` (`id`) ON DELETE SET NULL,
  CONSTRAINT `asset_maintenance_requested_by_foreign` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `asset_maintenance_vendor_id_foreign` FOREIGN KEY (`vendor_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asset_maintenance`
--

LOCK TABLES `asset_maintenance` WRITE;
/*!40000 ALTER TABLE `asset_maintenance` DISABLE KEYS */;
/*!40000 ALTER TABLE `asset_maintenance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `asset_movements`
--

DROP TABLE IF EXISTS `asset_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `asset_movements` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `asset_id` bigint(20) unsigned NOT NULL,
  `movement_type` enum('transfer','loan','return','adjustment') NOT NULL,
  `movement_date` date NOT NULL,
  `from_warehouse_id` bigint(20) unsigned DEFAULT NULL,
  `from_department_id` bigint(20) unsigned DEFAULT NULL,
  `from_employee_id` bigint(20) unsigned DEFAULT NULL,
  `from_location` varchar(500) DEFAULT NULL,
  `to_warehouse_id` bigint(20) unsigned DEFAULT NULL,
  `to_department_id` bigint(20) unsigned DEFAULT NULL,
  `to_employee_id` bigint(20) unsigned DEFAULT NULL,
  `to_location` varchar(500) DEFAULT NULL,
  `quantity` decimal(15,3) NOT NULL DEFAULT 1.000,
  `reference_number` varchar(100) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('pending','approved','completed','cancelled') NOT NULL DEFAULT 'pending',
  `requested_by` bigint(20) unsigned DEFAULT NULL,
  `approved_by` bigint(20) unsigned DEFAULT NULL,
  `received_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `asset_movements_asset_id_foreign` (`asset_id`),
  KEY `asset_movements_from_warehouse_id_foreign` (`from_warehouse_id`),
  KEY `asset_movements_from_department_id_foreign` (`from_department_id`),
  KEY `asset_movements_from_employee_id_foreign` (`from_employee_id`),
  KEY `asset_movements_to_warehouse_id_foreign` (`to_warehouse_id`),
  KEY `asset_movements_to_department_id_foreign` (`to_department_id`),
  KEY `asset_movements_to_employee_id_foreign` (`to_employee_id`),
  KEY `asset_movements_requested_by_foreign` (`requested_by`),
  KEY `asset_movements_approved_by_foreign` (`approved_by`),
  KEY `asset_movements_received_by_foreign` (`received_by`),
  CONSTRAINT `asset_movements_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `asset_movements_asset_id_foreign` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `asset_movements_from_department_id_foreign` FOREIGN KEY (`from_department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `asset_movements_from_employee_id_foreign` FOREIGN KEY (`from_employee_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `asset_movements_from_warehouse_id_foreign` FOREIGN KEY (`from_warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE SET NULL,
  CONSTRAINT `asset_movements_received_by_foreign` FOREIGN KEY (`received_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `asset_movements_requested_by_foreign` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `asset_movements_to_department_id_foreign` FOREIGN KEY (`to_department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `asset_movements_to_employee_id_foreign` FOREIGN KEY (`to_employee_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `asset_movements_to_warehouse_id_foreign` FOREIGN KEY (`to_warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asset_movements`
--

LOCK TABLES `asset_movements` WRITE;
/*!40000 ALTER TABLE `asset_movements` DISABLE KEYS */;
/*!40000 ALTER TABLE `asset_movements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `asset_revaluation`
--

DROP TABLE IF EXISTS `asset_revaluation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `asset_revaluation` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `asset_id` bigint(20) unsigned NOT NULL,
  `revaluation_date` date NOT NULL,
  `previous_cost` decimal(20,4) NOT NULL,
  `previous_accumulated_depreciation` decimal(20,4) NOT NULL,
  `previous_net_book_value` decimal(20,4) NOT NULL,
  `new_cost` decimal(20,4) NOT NULL,
  `new_accumulated_depreciation` decimal(20,4) NOT NULL,
  `new_net_book_value` decimal(20,4) NOT NULL,
  `cost_increase` decimal(20,4) DEFAULT NULL,
  `cost_decrease` decimal(20,4) DEFAULT NULL,
  `revaluation_surplus` decimal(20,4) DEFAULT NULL,
  `revaluation_deficit` decimal(20,4) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `journal_entry_id` bigint(20) unsigned DEFAULT NULL,
  `is_posted` tinyint(1) NOT NULL DEFAULT 0,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `approved_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `asset_revaluation_asset_id_foreign` (`asset_id`),
  KEY `asset_revaluation_journal_entry_id_foreign` (`journal_entry_id`),
  KEY `asset_revaluation_created_by_foreign` (`created_by`),
  KEY `asset_revaluation_approved_by_foreign` (`approved_by`),
  CONSTRAINT `asset_revaluation_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `asset_revaluation_asset_id_foreign` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `asset_revaluation_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `asset_revaluation_journal_entry_id_foreign` FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asset_revaluation`
--

LOCK TABLES `asset_revaluation` WRITE;
/*!40000 ALTER TABLE `asset_revaluation` DISABLE KEYS */;
/*!40000 ALTER TABLE `asset_revaluation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `assets`
--

DROP TABLE IF EXISTS `assets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `assets` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `asset_number` varchar(50) NOT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `barcode` varchar(100) DEFAULT NULL,
  `name_ar` varchar(200) NOT NULL,
  `name_en` varchar(200) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `category_id` bigint(20) unsigned NOT NULL,
  `unit_id` bigint(20) unsigned NOT NULL,
  `currency_id` bigint(20) unsigned NOT NULL,
  `quantity` decimal(15,3) NOT NULL DEFAULT 1.000,
  `unit_cost` decimal(20,4) NOT NULL,
  `total_cost` decimal(20,4) NOT NULL,
  `purchase_date` date NOT NULL,
  `activation_date` date DEFAULT NULL,
  `warranty_expiry` date DEFAULT NULL,
  `salvage_value` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `current_value` decimal(20,4) DEFAULT NULL,
  `accumulated_depreciation` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `net_book_value` decimal(20,4) DEFAULT NULL,
  `warehouse_id` bigint(20) unsigned DEFAULT NULL,
  `department_id` bigint(20) unsigned DEFAULT NULL,
  `employee_id` bigint(20) unsigned DEFAULT NULL,
  `location_description` varchar(500) DEFAULT NULL,
  `status` enum('active','idle','under_maintenance','disposed','sold','transferred') NOT NULL DEFAULT 'active',
  `condition` enum('excellent','good','fair','poor','critical') NOT NULL DEFAULT 'good',
  `inventory_account_id` int(10) unsigned DEFAULT NULL,
  `tax_id` bigint(20) unsigned DEFAULT NULL,
  `tax_amount` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `image_path` varchar(500) DEFAULT NULL,
  `specifications` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`specifications`)),
  `depreciation_start_date` date DEFAULT NULL,
  `is_depreciable` tinyint(1) NOT NULL DEFAULT 1,
  `depreciation_method` enum('straight_line','declining_balance','units_of_production') NOT NULL DEFAULT 'straight_line',
  `useful_life_years` decimal(10,2) DEFAULT NULL,
  `depreciation_rate` decimal(5,2) DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `assets_asset_number_unique` (`asset_number`),
  KEY `assets_unit_id_foreign` (`unit_id`),
  KEY `assets_currency_id_foreign` (`currency_id`),
  KEY `assets_tax_id_foreign` (`tax_id`),
  KEY `assets_created_by_foreign` (`created_by`),
  KEY `assets_updated_by_foreign` (`updated_by`),
  KEY `assets_asset_number_index` (`asset_number`),
  KEY `assets_category_id_index` (`category_id`),
  KEY `assets_warehouse_id_index` (`warehouse_id`),
  KEY `assets_department_id_index` (`department_id`),
  KEY `assets_employee_id_index` (`employee_id`),
  KEY `assets_status_index` (`status`),
  KEY `assets_inventory_account_id_index` (`inventory_account_id`),
  CONSTRAINT `assets_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `asset_categories` (`id`),
  CONSTRAINT `assets_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `assets_currency_id_foreign` FOREIGN KEY (`currency_id`) REFERENCES `currencies` (`id`),
  CONSTRAINT `assets_department_id_foreign` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `assets_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `assets_inventory_account_id_foreign` FOREIGN KEY (`inventory_account_id`) REFERENCES `accounts` (`AccID`) ON DELETE SET NULL,
  CONSTRAINT `assets_tax_id_foreign` FOREIGN KEY (`tax_id`) REFERENCES `purchase_taxes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `assets_unit_id_foreign` FOREIGN KEY (`unit_id`) REFERENCES `item_units` (`id`),
  CONSTRAINT `assets_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `assets_warehouse_id_foreign` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assets`
--

LOCK TABLES `assets` WRITE;
/*!40000 ALTER TABLE `assets` DISABLE KEYS */;
/*!40000 ALTER TABLE `assets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attributes`
--

DROP TABLE IF EXISTS `attributes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `attributes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `code` varchar(100) DEFAULT NULL,
  `type` enum('text','number','date','boolean','select') NOT NULL DEFAULT 'text',
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `attributes_code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attributes`
--

LOCK TABLES `attributes` WRITE;
/*!40000 ALTER TABLE `attributes` DISABLE KEYS */;
/*!40000 ALTER TABLE `attributes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bank_accounts`
--

DROP TABLE IF EXISTS `bank_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `bank_accounts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `bank_id` bigint(20) unsigned NOT NULL,
  `account_name` varchar(150) NOT NULL,
  `account_number` varchar(100) NOT NULL,
  `iban` varchar(50) DEFAULT NULL,
  `currency` varchar(10) NOT NULL,
  `opening_balance` decimal(18,2) NOT NULL DEFAULT 0.00,
  `current_balance` decimal(18,2) NOT NULL DEFAULT 0.00,
  `gl_account_id` bigint(20) unsigned DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bank_accounts_account_number_unique` (`account_number`),
  KEY `bank_accounts_bank_id_index` (`bank_id`),
  CONSTRAINT `bank_accounts_bank_id_foreign` FOREIGN KEY (`bank_id`) REFERENCES `banks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bank_accounts`
--

LOCK TABLES `bank_accounts` WRITE;
/*!40000 ALTER TABLE `bank_accounts` DISABLE KEYS */;
/*!40000 ALTER TABLE `bank_accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bank_payments`
--

DROP TABLE IF EXISTS `bank_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `bank_payments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `bank_account_id` bigint(20) unsigned NOT NULL,
  `payment_no` varchar(100) NOT NULL,
  `payment_date` date NOT NULL,
  `payee_type` enum('supplier','employee','other') NOT NULL,
  `payee_id` bigint(20) unsigned DEFAULT NULL,
  `amount` decimal(18,2) NOT NULL,
  `reference` varchar(150) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('draft','posted','cancelled') NOT NULL DEFAULT 'draft',
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bank_payments_payment_no_unique` (`payment_no`),
  KEY `bank_payments_bank_account_id_index` (`bank_account_id`),
  CONSTRAINT `bank_payments_bank_account_id_foreign` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bank_payments`
--

LOCK TABLES `bank_payments` WRITE;
/*!40000 ALTER TABLE `bank_payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `bank_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bank_receipts`
--

DROP TABLE IF EXISTS `bank_receipts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `bank_receipts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `bank_account_id` bigint(20) unsigned NOT NULL,
  `receipt_no` varchar(100) NOT NULL,
  `receipt_date` date NOT NULL,
  `payer_type` enum('customer','other') NOT NULL,
  `payer_id` bigint(20) unsigned DEFAULT NULL,
  `amount` decimal(18,2) NOT NULL,
  `reference` varchar(150) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('draft','posted','cancelled') NOT NULL DEFAULT 'draft',
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bank_receipts_receipt_no_unique` (`receipt_no`),
  KEY `bank_receipts_bank_account_id_index` (`bank_account_id`),
  CONSTRAINT `bank_receipts_bank_account_id_foreign` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bank_receipts`
--

LOCK TABLES `bank_receipts` WRITE;
/*!40000 ALTER TABLE `bank_receipts` DISABLE KEYS */;
/*!40000 ALTER TABLE `bank_receipts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `banks`
--

DROP TABLE IF EXISTS `banks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `banks` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `bank_code` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `short_name` varchar(50) DEFAULT NULL,
  `swift_code` varchar(50) DEFAULT NULL,
  `iban_prefix` varchar(10) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `currency` varchar(10) DEFAULT NULL,
  `logo` varchar(191) DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `banks_bank_code_unique` (`bank_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `banks`
--

LOCK TABLES `banks` WRITE;
/*!40000 ALTER TABLE `banks` DISABLE KEYS */;
/*!40000 ALTER TABLE `banks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `branches`
--

DROP TABLE IF EXISTS `branches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `branches` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `branch_code` varchar(255) DEFAULT NULL,
  `branch_name` varchar(255) NOT NULL,
  `english_name` varchar(255) DEFAULT NULL,
  `branch_type` varchar(255) DEFAULT NULL,
  `job_title` varchar(255) DEFAULT NULL,
  `mobile` varchar(255) DEFAULT NULL,
  `country` varchar(255) DEFAULT NULL,
  `city` varchar(255) DEFAULT NULL,
  `area` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `logo` varchar(255) DEFAULT NULL,
  `accountant_name` varchar(255) DEFAULT NULL,
  `commercial_registration` varchar(255) DEFAULT NULL,
  `tax_number` varchar(255) DEFAULT NULL,
  `vat_number` varchar(255) DEFAULT NULL,
  `date_of_establishment` date DEFAULT NULL,
  `social_insurance_number` varchar(255) DEFAULT NULL,
  `annual_goals` text DEFAULT NULL,
  `work_center` varchar(255) DEFAULT NULL,
  `storage` varchar(255) DEFAULT NULL,
  `subsidiary_company` varchar(255) DEFAULT NULL,
  `email_address` varchar(255) DEFAULT NULL,
  `official_email` varchar(255) DEFAULT NULL,
  `facebook` varchar(255) DEFAULT NULL,
  `telegram` varchar(255) DEFAULT NULL,
  `youtube` varchar(255) DEFAULT NULL,
  `instagram` varchar(255) DEFAULT NULL,
  `account_holder_name` varchar(255) DEFAULT NULL,
  `bank_name` varchar(255) DEFAULT NULL,
  `iban` varchar(255) DEFAULT NULL,
  `bank_branch_name` varchar(255) DEFAULT NULL,
  `swift_bic` varchar(255) DEFAULT NULL,
  `bank_address` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `branch_infos_branch_code_unique` (`branch_code`),
  KEY `branch_infos_company_id_foreign` (`company_id`),
  CONSTRAINT `branch_infos_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branches`
--

LOCK TABLES `branches` WRITE;
/*!40000 ALTER TABLE `branches` DISABLE KEYS */;
/*!40000 ALTER TABLE `branches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `brands`
--

DROP TABLE IF EXISTS `brands`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `brands` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `brand_code` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `parent_id` bigint(20) unsigned DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `order` int(11) NOT NULL DEFAULT 0,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `brands_brand_code_unique` (`brand_code`),
  KEY `brands_parent_id_foreign` (`parent_id`),
  CONSTRAINT `brands_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `brands` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `brands`
--

LOCK TABLES `brands` WRITE;
/*!40000 ALTER TABLE `brands` DISABLE KEYS */;
/*!40000 ALTER TABLE `brands` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `brokers`
--

DROP TABLE IF EXISTS `brokers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `brokers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `broker_code` varchar(50) NOT NULL,
  `license_number` varchar(100) DEFAULT NULL,
  `regulatory_authority` varchar(200) DEFAULT NULL,
  `broker_name_ar` varchar(200) NOT NULL,
  `broker_name_en` varchar(200) DEFAULT NULL,
  `legal_name_ar` varchar(200) DEFAULT NULL,
  `legal_name_en` varchar(200) DEFAULT NULL,
  `broker_type` enum('stock','forex','commodities','crypto','full_service','discount','online','institutional') NOT NULL,
  `membership_class` enum('regular','market_maker','specialist','clearing_member') NOT NULL DEFAULT 'regular',
  `country_id` bigint(20) unsigned NOT NULL,
  `state_id` bigint(20) unsigned DEFAULT NULL,
  `city_id` bigint(20) unsigned DEFAULT NULL,
  `headquarters_address_ar` varchar(500) DEFAULT NULL,
  `headquarters_address_en` varchar(500) DEFAULT NULL,
  `branches_count` int(11) NOT NULL DEFAULT 1,
  `phone` varchar(50) DEFAULT NULL,
  `fax` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `website` varchar(500) DEFAULT NULL,
  `support_email` varchar(100) DEFAULT NULL,
  `emergency_phone` varchar(50) DEFAULT NULL,
  `ceo_name_ar` varchar(200) DEFAULT NULL,
  `ceo_name_en` varchar(200) DEFAULT NULL,
  `compliance_officer_ar` varchar(200) DEFAULT NULL,
  `compliance_officer_en` varchar(200) DEFAULT NULL,
  `account_manager_ar` varchar(200) DEFAULT NULL,
  `account_manager_en` varchar(200) DEFAULT NULL,
  `licenses` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`licenses`)),
  `exchanges_membership` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`exchanges_membership`)),
  `is_regulated` tinyint(1) NOT NULL DEFAULT 1,
  `regulation_expiry` date DEFAULT NULL,
  `commission_structure` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`commission_structure`)),
  `fee_structure` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`fee_structure`)),
  `margin_requirements` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`margin_requirements`)),
  `supported_instruments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`supported_instruments`)),
  `trading_platforms` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`trading_platforms`)),
  `minimum_deposit` decimal(20,4) DEFAULT NULL,
  `minimum_trade_size` decimal(20,4) DEFAULT NULL,
  `deposit_bank_accounts` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`deposit_bank_accounts`)),
  `withdrawal_methods` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`withdrawal_methods`)),
  `coverage_countries` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`coverage_countries`)),
  `supported_languages` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`supported_languages`)),
  `customer_support_hours` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`customer_support_hours`)),
  `credit_rating` varchar(10) DEFAULT NULL,
  `reliability_score` int(11) DEFAULT NULL,
  `customer_satisfaction_score` decimal(3,2) DEFAULT NULL,
  `license_document_path` varchar(500) DEFAULT NULL,
  `compliance_certificate_path` varchar(500) DEFAULT NULL,
  `terms_and_conditions_path` varchar(500) DEFAULT NULL,
  `status` enum('active','suspended','revoked','blacklisted','inactive') NOT NULL DEFAULT 'active',
  `is_preferred` tinyint(1) NOT NULL DEFAULT 0,
  `is_approved` tinyint(1) NOT NULL DEFAULT 1,
  `approval_date` date DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `approved_by` bigint(20) unsigned DEFAULT NULL,
  `reviewed_by` bigint(20) unsigned DEFAULT NULL,
  `last_review_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `brokers_broker_code_unique` (`broker_code`),
  KEY `brokers_state_id_foreign` (`state_id`),
  KEY `brokers_city_id_foreign` (`city_id`),
  KEY `brokers_broker_type_index` (`broker_type`),
  KEY `idx_country_status` (`country_id`,`status`),
  KEY `brokers_is_preferred_index` (`is_preferred`),
  KEY `idx_regulatory_auth` (`regulatory_authority`),
  KEY `idx_license_number` (`license_number`),
  CONSTRAINT `brokers_city_id_foreign` FOREIGN KEY (`city_id`) REFERENCES `cities` (`id`),
  CONSTRAINT `brokers_country_id_foreign` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`),
  CONSTRAINT `brokers_state_id_foreign` FOREIGN KEY (`state_id`) REFERENCES `states` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `brokers`
--

LOCK TABLES `brokers` WRITE;
/*!40000 ALTER TABLE `brokers` DISABLE KEYS */;
/*!40000 ALTER TABLE `brokers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `budget_allocation_logs`
--

DROP TABLE IF EXISTS `budget_allocation_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `budget_allocation_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `allocation_date` date NOT NULL,
  `from_source` varchar(100) DEFAULT NULL,
  `to_destination` varchar(100) DEFAULT NULL,
  `allocated_amount` decimal(20,4) NOT NULL,
  `allocation_method` varchar(50) DEFAULT NULL,
  `allocation_reason` text DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `budget_allocation_logs_created_by_foreign` (`created_by`),
  CONSTRAINT `budget_allocation_logs_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `budget_allocation_logs`
--

LOCK TABLES `budget_allocation_logs` WRITE;
/*!40000 ALTER TABLE `budget_allocation_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `budget_allocation_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `budget_analysis`
--

DROP TABLE IF EXISTS `budget_analysis`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `budget_analysis` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `analysis_date` date NOT NULL,
  `kpi_code` varchar(50) NOT NULL,
  `kpi_name_ar` varchar(200) NOT NULL,
  `kpi_name_en` varchar(200) DEFAULT NULL,
  `actual_value` decimal(20,4) DEFAULT NULL,
  `target_value` decimal(20,4) DEFAULT NULL,
  `variance_value` decimal(20,4) DEFAULT NULL,
  `variance_percent` decimal(10,2) DEFAULT NULL,
  `analysis_period` enum('daily','weekly','monthly','quarterly','yearly') DEFAULT NULL,
  `analysis_notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `budget_analysis`
--

LOCK TABLES `budget_analysis` WRITE;
/*!40000 ALTER TABLE `budget_analysis` DISABLE KEYS */;
/*!40000 ALTER TABLE `budget_analysis` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `budget_approvals`
--

DROP TABLE IF EXISTS `budget_approvals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `budget_approvals` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `budget_id` bigint(20) unsigned NOT NULL,
  `approval_type` enum('budget','transfer','forecast','over_budget') NOT NULL,
  `reference_id` bigint(20) unsigned DEFAULT NULL,
  `approval_stage` int(11) NOT NULL DEFAULT 1,
  `total_stages` int(11) NOT NULL DEFAULT 1,
  `sequence_number` int(11) NOT NULL DEFAULT 1,
  `approver_id` bigint(20) unsigned NOT NULL,
  `approval_date` date DEFAULT NULL,
  `approval_status` enum('pending','approved','rejected','delegated') NOT NULL DEFAULT 'pending',
  `approval_notes` text DEFAULT NULL,
  `minimum_amount` decimal(20,4) DEFAULT NULL,
  `maximum_amount` decimal(20,4) DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `is_mandatory` tinyint(1) NOT NULL DEFAULT 1,
  `is_completed` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `budget_approvals_budget_id_foreign` (`budget_id`),
  KEY `budget_approvals_approver_id_foreign` (`approver_id`),
  KEY `idx_approval_status` (`approval_status`),
  KEY `idx_approval_type` (`approval_type`,`reference_id`),
  CONSTRAINT `budget_approvals_approver_id_foreign` FOREIGN KEY (`approver_id`) REFERENCES `users` (`id`),
  CONSTRAINT `budget_approvals_budget_id_foreign` FOREIGN KEY (`budget_id`) REFERENCES `budgets` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `budget_approvals`
--

LOCK TABLES `budget_approvals` WRITE;
/*!40000 ALTER TABLE `budget_approvals` DISABLE KEYS */;
/*!40000 ALTER TABLE `budget_approvals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `budget_categories`
--

DROP TABLE IF EXISTS `budget_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `budget_categories` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `parent_id` bigint(20) unsigned DEFAULT NULL,
  `code` varchar(50) NOT NULL,
  `name_ar` varchar(200) NOT NULL,
  `name_en` varchar(200) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `category_type` varchar(255) NOT NULL,
  `level` int(11) NOT NULL DEFAULT 1,
  `path` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_final` tinyint(1) NOT NULL DEFAULT 0,
  `account_id` int(10) unsigned DEFAULT NULL,
  `department_id` bigint(20) unsigned DEFAULT NULL,
  `project_id` bigint(20) unsigned DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `budget_categories_code_unique` (`code`),
  KEY `budget_categories_parent_id_foreign` (`parent_id`),
  KEY `budget_categories_account_id_foreign` (`account_id`),
  KEY `budget_categories_department_id_foreign` (`department_id`),
  KEY `budget_categories_created_by_foreign` (`created_by`),
  KEY `budget_categories_updated_by_foreign` (`updated_by`),
  KEY `budget_categories_category_type_index` (`category_type`),
  KEY `budget_categories_path_index` (`path`),
  CONSTRAINT `budget_categories_account_id_foreign` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`AccID`) ON DELETE SET NULL,
  CONSTRAINT `budget_categories_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `budget_categories_department_id_foreign` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `budget_categories_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `budget_categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `budget_categories_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `budget_categories`
--

LOCK TABLES `budget_categories` WRITE;
/*!40000 ALTER TABLE `budget_categories` DISABLE KEYS */;
/*!40000 ALTER TABLE `budget_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `budget_commitments`
--

DROP TABLE IF EXISTS `budget_commitments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `budget_commitments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `budget_id` bigint(20) unsigned NOT NULL,
  `budget_item_id` bigint(20) unsigned NOT NULL,
  `reference_type` enum('purchase_order','contract','invoice','requisition') NOT NULL,
  `reference_id` bigint(20) unsigned NOT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `committed_amount` decimal(20,4) NOT NULL,
  `utilized_amount` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `remaining_amount` decimal(20,4) NOT NULL,
  `commitment_date` date NOT NULL,
  `expected_expense_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `status` enum('active','partially_utilized','fully_utilized','expired','cancelled') NOT NULL DEFAULT 'active',
  `description` text DEFAULT NULL,
  `vendor_id` bigint(20) unsigned DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `budget_commitments_budget_id_foreign` (`budget_id`),
  KEY `budget_commitments_budget_item_id_foreign` (`budget_item_id`),
  KEY `budget_commitments_created_by_foreign` (`created_by`),
  KEY `budget_commitments_updated_by_foreign` (`updated_by`),
  KEY `idx_commitment_status` (`status`),
  KEY `idx_reference` (`reference_type`,`reference_id`),
  KEY `budget_commitments_vendor_id_foreign` (`vendor_id`),
  CONSTRAINT `budget_commitments_budget_id_foreign` FOREIGN KEY (`budget_id`) REFERENCES `budgets` (`id`),
  CONSTRAINT `budget_commitments_budget_item_id_foreign` FOREIGN KEY (`budget_item_id`) REFERENCES `budget_items` (`id`),
  CONSTRAINT `budget_commitments_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `budget_commitments_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `budget_commitments_vendor_id_foreign` FOREIGN KEY (`vendor_id`) REFERENCES `suppliers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `budget_commitments`
--

LOCK TABLES `budget_commitments` WRITE;
/*!40000 ALTER TABLE `budget_commitments` DISABLE KEYS */;
/*!40000 ALTER TABLE `budget_commitments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `budget_forecasts`
--

DROP TABLE IF EXISTS `budget_forecasts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `budget_forecasts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `budget_id` bigint(20) unsigned NOT NULL,
  `forecast_number` varchar(50) NOT NULL,
  `forecast_type` enum('revision','forecast','adjustment','transfer') NOT NULL,
  `revision_reason` text DEFAULT NULL,
  `reference_budget_item_id` bigint(20) unsigned DEFAULT NULL,
  `destination_budget_item_id` bigint(20) unsigned DEFAULT NULL,
  `forecast_date` date NOT NULL,
  `effective_date` date NOT NULL,
  `original_amount` decimal(20,4) NOT NULL,
  `revised_amount` decimal(20,4) NOT NULL,
  `difference_amount` decimal(20,4) NOT NULL,
  `difference_percent` decimal(10,2) DEFAULT NULL,
  `status` enum('draft','pending_approval','approved','rejected','implemented') NOT NULL DEFAULT 'draft',
  `approved_amount` decimal(20,4) DEFAULT NULL,
  `approved_by` bigint(20) unsigned DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `reviewed_by` bigint(20) unsigned DEFAULT NULL,
  `implemented_by` bigint(20) unsigned DEFAULT NULL,
  `approved_date` date DEFAULT NULL,
  `implemented_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `budget_forecasts_forecast_number_unique` (`forecast_number`),
  KEY `budget_forecasts_budget_id_foreign` (`budget_id`),
  KEY `budget_forecasts_reference_budget_item_id_foreign` (`reference_budget_item_id`),
  KEY `budget_forecasts_approved_by_foreign` (`approved_by`),
  KEY `budget_forecasts_created_by_foreign` (`created_by`),
  KEY `budget_forecasts_reviewed_by_foreign` (`reviewed_by`),
  KEY `budget_forecasts_implemented_by_foreign` (`implemented_by`),
  KEY `idx_forecast_status` (`status`),
  KEY `idx_forecast_date` (`forecast_date`),
  KEY `budget_forecasts_destination_budget_item_id_foreign` (`destination_budget_item_id`),
  CONSTRAINT `budget_forecasts_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `budget_forecasts_budget_id_foreign` FOREIGN KEY (`budget_id`) REFERENCES `budgets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `budget_forecasts_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `budget_forecasts_destination_budget_item_id_foreign` FOREIGN KEY (`destination_budget_item_id`) REFERENCES `budget_items` (`id`) ON DELETE SET NULL,
  CONSTRAINT `budget_forecasts_implemented_by_foreign` FOREIGN KEY (`implemented_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `budget_forecasts_reference_budget_item_id_foreign` FOREIGN KEY (`reference_budget_item_id`) REFERENCES `budget_items` (`id`) ON DELETE SET NULL,
  CONSTRAINT `budget_forecasts_reviewed_by_foreign` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `budget_forecasts`
--

LOCK TABLES `budget_forecasts` WRITE;
/*!40000 ALTER TABLE `budget_forecasts` DISABLE KEYS */;
/*!40000 ALTER TABLE `budget_forecasts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `budget_items`
--

DROP TABLE IF EXISTS `budget_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `budget_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `budget_id` bigint(20) unsigned NOT NULL,
  `category_id` bigint(20) unsigned NOT NULL,
  `account_id` int(10) unsigned NOT NULL,
  `period_type` enum('monthly','quarterly','yearly','custom') NOT NULL DEFAULT 'monthly',
  `annual_amount` decimal(20,4) NOT NULL,
  `annual_actual` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `annual_variance` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `annual_variance_percent` decimal(10,2) NOT NULL DEFAULT 0.00,
  `jan_amount` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `feb_amount` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `mar_amount` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `apr_amount` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `may_amount` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `jun_amount` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `jul_amount` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `aug_amount` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `sep_amount` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `oct_amount` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `nov_amount` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `dec_amount` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `jan_actual` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `feb_actual` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `mar_actual` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `apr_actual` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `may_actual` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `jun_actual` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `jul_actual` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `aug_actual` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `sep_actual` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `oct_actual` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `nov_actual` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `dec_actual` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `calculation_method` enum('fixed','formula','historical','percentage') NOT NULL DEFAULT 'fixed',
  `calculation_formula` text DEFAULT NULL,
  `basis_amount` decimal(20,4) DEFAULT NULL,
  `percentage_rate` decimal(10,2) DEFAULT NULL,
  `tax_id` bigint(20) unsigned DEFAULT NULL,
  `tax_included` tinyint(1) NOT NULL DEFAULT 0,
  `tax_amount` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `notes` text DEFAULT NULL,
  `assumptions` text DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_budget_account` (`budget_id`,`account_id`,`category_id`),
  KEY `budget_items_category_id_foreign` (`category_id`),
  KEY `budget_items_account_id_foreign` (`account_id`),
  KEY `budget_items_tax_id_foreign` (`tax_id`),
  KEY `budget_items_created_by_foreign` (`created_by`),
  KEY `budget_items_updated_by_foreign` (`updated_by`),
  KEY `budget_items_budget_id_period_type_index` (`budget_id`,`period_type`),
  CONSTRAINT `budget_items_account_id_foreign` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`AccID`),
  CONSTRAINT `budget_items_budget_id_foreign` FOREIGN KEY (`budget_id`) REFERENCES `budgets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `budget_items_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `budget_categories` (`id`),
  CONSTRAINT `budget_items_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `budget_items_tax_id_foreign` FOREIGN KEY (`tax_id`) REFERENCES `taxes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `budget_items_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `budget_items`
--

LOCK TABLES `budget_items` WRITE;
/*!40000 ALTER TABLE `budget_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `budget_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `budget_monitoring`
--

DROP TABLE IF EXISTS `budget_monitoring`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `budget_monitoring` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `budget_id` bigint(20) unsigned NOT NULL,
  `budget_item_id` bigint(20) unsigned NOT NULL,
  `monitoring_date` date NOT NULL,
  `actual_amount` decimal(20,4) NOT NULL,
  `committed_amount` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `encumbered_amount` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `available_amount` decimal(20,4) NOT NULL,
  `period_type` enum('monthly','quarterly','year_to_date','full_year') NOT NULL,
  `period_month` int(11) DEFAULT NULL,
  `period_quarter` int(11) DEFAULT NULL,
  `period_year` int(11) DEFAULT NULL,
  `variance_amount` decimal(20,4) NOT NULL,
  `variance_percent` decimal(10,2) NOT NULL,
  `variance_status` enum('favorable','unfavorable','neutral') NOT NULL,
  `threshold_breached` tinyint(1) NOT NULL DEFAULT 0,
  `alert_level` enum('low','medium','high','critical') NOT NULL DEFAULT 'low',
  `comments` text DEFAULT NULL,
  `action_required` text DEFAULT NULL,
  `follow_up_date` date DEFAULT NULL,
  `monitored_by` bigint(20) unsigned DEFAULT NULL,
  `acknowledged_by` bigint(20) unsigned DEFAULT NULL,
  `acknowledged_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_monitoring` (`budget_item_id`,`monitoring_date`,`period_type`),
  KEY `budget_monitoring_budget_id_foreign` (`budget_id`),
  KEY `budget_monitoring_monitored_by_foreign` (`monitored_by`),
  KEY `budget_monitoring_acknowledged_by_foreign` (`acknowledged_by`),
  KEY `idx_monitoring_date` (`monitoring_date`),
  KEY `idx_variance_status` (`variance_status`),
  CONSTRAINT `budget_monitoring_acknowledged_by_foreign` FOREIGN KEY (`acknowledged_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `budget_monitoring_budget_id_foreign` FOREIGN KEY (`budget_id`) REFERENCES `budgets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `budget_monitoring_budget_item_id_foreign` FOREIGN KEY (`budget_item_id`) REFERENCES `budget_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `budget_monitoring_monitored_by_foreign` FOREIGN KEY (`monitored_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `budget_monitoring`
--

LOCK TABLES `budget_monitoring` WRITE;
/*!40000 ALTER TABLE `budget_monitoring` DISABLE KEYS */;
/*!40000 ALTER TABLE `budget_monitoring` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `budget_reports`
--

DROP TABLE IF EXISTS `budget_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `budget_reports` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `report_number` varchar(50) NOT NULL,
  `report_name_ar` varchar(200) NOT NULL,
  `report_name_en` varchar(200) DEFAULT NULL,
  `report_type` enum('variance','performance','forecast','consolidation','custom') NOT NULL,
  `budget_id` bigint(20) unsigned DEFAULT NULL,
  `department_id` bigint(20) unsigned DEFAULT NULL,
  `project_id` bigint(20) unsigned DEFAULT NULL,
  `report_date` date NOT NULL,
  `period_start` date DEFAULT NULL,
  `period_end` date DEFAULT NULL,
  `report_format` enum('summary','detailed','comparative','graphical') NOT NULL DEFAULT 'summary',
  `include_details` tinyint(1) NOT NULL DEFAULT 1,
  `include_comments` tinyint(1) NOT NULL DEFAULT 1,
  `include_recommendations` tinyint(1) NOT NULL DEFAULT 1,
  `file_path` varchar(500) DEFAULT NULL,
  `file_size` int(11) DEFAULT NULL,
  `generated_file_name` varchar(255) DEFAULT NULL,
  `generated_by` bigint(20) unsigned DEFAULT NULL,
  `reviewed_by` bigint(20) unsigned DEFAULT NULL,
  `approved_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `generated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `budget_reports_report_number_unique` (`report_number`),
  KEY `budget_reports_budget_id_foreign` (`budget_id`),
  KEY `budget_reports_department_id_foreign` (`department_id`),
  KEY `budget_reports_generated_by_foreign` (`generated_by`),
  KEY `budget_reports_reviewed_by_foreign` (`reviewed_by`),
  KEY `budget_reports_approved_by_foreign` (`approved_by`),
  KEY `idx_report_type` (`report_type`),
  KEY `idx_report_date` (`report_date`),
  CONSTRAINT `budget_reports_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `budget_reports_budget_id_foreign` FOREIGN KEY (`budget_id`) REFERENCES `budgets` (`id`),
  CONSTRAINT `budget_reports_department_id_foreign` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`),
  CONSTRAINT `budget_reports_generated_by_foreign` FOREIGN KEY (`generated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `budget_reports_reviewed_by_foreign` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `budget_reports`
--

LOCK TABLES `budget_reports` WRITE;
/*!40000 ALTER TABLE `budget_reports` DISABLE KEYS */;
/*!40000 ALTER TABLE `budget_reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `budget_templates`
--

DROP TABLE IF EXISTS `budget_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `budget_templates` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `template_code` varchar(50) NOT NULL,
  `template_name_ar` varchar(200) NOT NULL,
  `template_name_en` varchar(200) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `template_type` enum('department','project','product','service','general') NOT NULL,
  `industry_type` varchar(100) DEFAULT NULL,
  `category_structure` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`category_structure`)),
  `default_percentages` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`default_percentages`)),
  `calculation_rules` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`calculation_rules`)),
  `documentation_path` varchar(500) DEFAULT NULL,
  `sample_file_path` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_system_template` tinyint(1) NOT NULL DEFAULT 0,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `budget_templates_template_code_unique` (`template_code`),
  KEY `budget_templates_created_by_foreign` (`created_by`),
  KEY `budget_templates_updated_by_foreign` (`updated_by`),
  KEY `idx_template_type` (`template_type`),
  CONSTRAINT `budget_templates_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `budget_templates_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `budget_templates`
--

LOCK TABLES `budget_templates` WRITE;
/*!40000 ALTER TABLE `budget_templates` DISABLE KEYS */;
/*!40000 ALTER TABLE `budget_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `budget_transfers`
--

DROP TABLE IF EXISTS `budget_transfers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `budget_transfers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `transfer_number` varchar(50) NOT NULL,
  `transfer_date` date NOT NULL,
  `from_budget_id` bigint(20) unsigned NOT NULL,
  `from_budget_item_id` bigint(20) unsigned NOT NULL,
  `from_amount` decimal(20,4) NOT NULL,
  `to_budget_id` bigint(20) unsigned NOT NULL,
  `to_budget_item_id` bigint(20) unsigned NOT NULL,
  `to_amount` decimal(20,4) NOT NULL,
  `transfer_type` enum('internal','interdepartmental','supplemental') NOT NULL,
  `reason` text NOT NULL,
  `justification` text DEFAULT NULL,
  `reference_document` varchar(500) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('draft','pending_approval','approved','rejected','completed') NOT NULL DEFAULT 'draft',
  `requested_by` bigint(20) unsigned DEFAULT NULL,
  `approved_by` bigint(20) unsigned DEFAULT NULL,
  `processed_by` bigint(20) unsigned DEFAULT NULL,
  `approved_date` date DEFAULT NULL,
  `processed_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `budget_transfers_transfer_number_unique` (`transfer_number`),
  KEY `budget_transfers_from_budget_id_foreign` (`from_budget_id`),
  KEY `budget_transfers_from_budget_item_id_foreign` (`from_budget_item_id`),
  KEY `budget_transfers_to_budget_id_foreign` (`to_budget_id`),
  KEY `budget_transfers_to_budget_item_id_foreign` (`to_budget_item_id`),
  KEY `budget_transfers_requested_by_foreign` (`requested_by`),
  KEY `budget_transfers_approved_by_foreign` (`approved_by`),
  KEY `budget_transfers_processed_by_foreign` (`processed_by`),
  KEY `idx_transfer_status` (`status`),
  KEY `idx_transfer_date` (`transfer_date`),
  CONSTRAINT `budget_transfers_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `budget_transfers_from_budget_id_foreign` FOREIGN KEY (`from_budget_id`) REFERENCES `budgets` (`id`),
  CONSTRAINT `budget_transfers_from_budget_item_id_foreign` FOREIGN KEY (`from_budget_item_id`) REFERENCES `budget_items` (`id`),
  CONSTRAINT `budget_transfers_processed_by_foreign` FOREIGN KEY (`processed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `budget_transfers_requested_by_foreign` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `budget_transfers_to_budget_id_foreign` FOREIGN KEY (`to_budget_id`) REFERENCES `budgets` (`id`),
  CONSTRAINT `budget_transfers_to_budget_item_id_foreign` FOREIGN KEY (`to_budget_item_id`) REFERENCES `budget_items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `budget_transfers`
--

LOCK TABLES `budget_transfers` WRITE;
/*!40000 ALTER TABLE `budget_transfers` DISABLE KEYS */;
/*!40000 ALTER TABLE `budget_transfers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `budgets`
--

DROP TABLE IF EXISTS `budgets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `budgets` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `budget_number` varchar(50) NOT NULL,
  `budget_name_ar` varchar(200) NOT NULL,
  `budget_name_en` varchar(200) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `budget_type` enum('annual','quarterly','monthly','project','rolling') NOT NULL,
  `fiscal_year` int(11) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `scope_type` enum('company','department','project','cost_center','branch') NOT NULL,
  `department_id` bigint(20) unsigned DEFAULT NULL,
  `project_id` bigint(20) unsigned DEFAULT NULL,
  `cost_center_id` bigint(20) unsigned DEFAULT NULL,
  `branch_id` bigint(20) unsigned DEFAULT NULL,
  `currency_id` bigint(20) unsigned NOT NULL,
  `exchange_rate` decimal(20,6) NOT NULL DEFAULT 1.000000,
  `status` enum('draft','under_review','approved','active','closed','archived') NOT NULL DEFAULT 'draft',
  `version` int(11) NOT NULL DEFAULT 1,
  `is_current` tinyint(1) NOT NULL DEFAULT 0,
  `is_template` tinyint(1) NOT NULL DEFAULT 0,
  `total_revenue` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `total_expense` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `total_capital` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `net_surplus_deficit` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `variance_threshold` decimal(5,2) NOT NULL DEFAULT 10.00,
  `allow_over_budget` tinyint(1) NOT NULL DEFAULT 0,
  `require_approval_over_budget` tinyint(1) NOT NULL DEFAULT 1,
  `reference_document` varchar(500) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `approved_by` bigint(20) unsigned DEFAULT NULL,
  `approved_date` date DEFAULT NULL,
  `closed_by` bigint(20) unsigned DEFAULT NULL,
  `closed_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `budgets_budget_number_unique` (`budget_number`),
  KEY `budgets_department_id_foreign` (`department_id`),
  KEY `budgets_branch_id_foreign` (`branch_id`),
  KEY `budgets_currency_id_foreign` (`currency_id`),
  KEY `budgets_created_by_foreign` (`created_by`),
  KEY `budgets_approved_by_foreign` (`approved_by`),
  KEY `budgets_closed_by_foreign` (`closed_by`),
  KEY `budgets_fiscal_year_index` (`fiscal_year`),
  KEY `budgets_status_index` (`status`),
  KEY `idx_dates` (`start_date`,`end_date`),
  CONSTRAINT `budgets_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `budgets_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `budgets_closed_by_foreign` FOREIGN KEY (`closed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `budgets_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `budgets_currency_id_foreign` FOREIGN KEY (`currency_id`) REFERENCES `currencies` (`id`),
  CONSTRAINT `budgets_department_id_foreign` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `budgets`
--

LOCK TABLES `budgets` WRITE;
/*!40000 ALTER TABLE `budgets` DISABLE KEYS */;
/*!40000 ALTER TABLE `budgets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cache`
--

DROP TABLE IF EXISTS `cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cache` (
  `key` varchar(255) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` int(11) NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache`
--

LOCK TABLES `cache` WRITE;
/*!40000 ALTER TABLE `cache` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cache_locks`
--

DROP TABLE IF EXISTS `cache_locks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cache_locks` (
  `key` varchar(255) NOT NULL,
  `owner` varchar(255) NOT NULL,
  `expiration` int(11) NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache_locks`
--

LOCK TABLES `cache_locks` WRITE;
/*!40000 ALTER TABLE `cache_locks` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache_locks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cash_accounts`
--

DROP TABLE IF EXISTS `cash_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cash_accounts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `account_code` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `type` enum('cash','bank') NOT NULL DEFAULT 'cash',
  `bank_id` bigint(20) unsigned DEFAULT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'USD',
  `opening_balance` decimal(18,2) NOT NULL DEFAULT 0.00,
  `current_balance` decimal(18,2) NOT NULL DEFAULT 0.00,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cash_accounts_account_code_unique` (`account_code`),
  KEY `cash_accounts_bank_id_foreign` (`bank_id`),
  KEY `cash_accounts_created_by_foreign` (`created_by`),
  KEY `cash_accounts_updated_by_foreign` (`updated_by`),
  CONSTRAINT `cash_accounts_bank_id_foreign` FOREIGN KEY (`bank_id`) REFERENCES `banks` (`id`) ON DELETE SET NULL,
  CONSTRAINT `cash_accounts_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `cash_accounts_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cash_accounts`
--

LOCK TABLES `cash_accounts` WRITE;
/*!40000 ALTER TABLE `cash_accounts` DISABLE KEYS */;
/*!40000 ALTER TABLE `cash_accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cash_payments`
--

DROP TABLE IF EXISTS `cash_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cash_payments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `voucher_no` varchar(50) NOT NULL,
  `account_id` bigint(20) unsigned NOT NULL,
  `payee_type` varchar(255) DEFAULT NULL,
  `payee_id` bigint(20) unsigned DEFAULT NULL,
  `amount` decimal(18,2) NOT NULL,
  `payment_date` date NOT NULL,
  `reference_no` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('draft','posted','cancelled') NOT NULL DEFAULT 'posted',
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cash_payments_voucher_no_unique` (`voucher_no`),
  KEY `cash_payments_account_id_foreign` (`account_id`),
  KEY `cash_payments_payee_type_payee_id_index` (`payee_type`,`payee_id`),
  KEY `cash_payments_created_by_foreign` (`created_by`),
  KEY `cash_payments_updated_by_foreign` (`updated_by`),
  CONSTRAINT `cash_payments_account_id_foreign` FOREIGN KEY (`account_id`) REFERENCES `cash_accounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cash_payments_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `cash_payments_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cash_payments`
--

LOCK TABLES `cash_payments` WRITE;
/*!40000 ALTER TABLE `cash_payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `cash_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cash_receipts`
--

DROP TABLE IF EXISTS `cash_receipts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cash_receipts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `voucher_no` varchar(50) NOT NULL,
  `account_id` bigint(20) unsigned NOT NULL,
  `payer_type` varchar(255) DEFAULT NULL,
  `payer_id` bigint(20) unsigned DEFAULT NULL,
  `amount` decimal(18,2) NOT NULL,
  `receipt_date` date NOT NULL,
  `reference_no` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('draft','posted','cancelled') NOT NULL DEFAULT 'posted',
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cash_receipts_voucher_no_unique` (`voucher_no`),
  KEY `cash_receipts_account_id_foreign` (`account_id`),
  KEY `cash_receipts_payer_type_payer_id_index` (`payer_type`,`payer_id`),
  KEY `cash_receipts_created_by_foreign` (`created_by`),
  KEY `cash_receipts_updated_by_foreign` (`updated_by`),
  CONSTRAINT `cash_receipts_account_id_foreign` FOREIGN KEY (`account_id`) REFERENCES `cash_accounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cash_receipts_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `cash_receipts_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cash_receipts`
--

LOCK TABLES `cash_receipts` WRITE;
/*!40000 ALTER TABLE `cash_receipts` DISABLE KEYS */;
/*!40000 ALTER TABLE `cash_receipts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `categories` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `category_code` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `name_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`name_json`)),
  `slug` varchar(255) DEFAULT NULL,
  `slug_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`slug_json`)),
  `description` text DEFAULT NULL,
  `icon` varchar(255) DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `is_featured` tinyint(1) NOT NULL DEFAULT 0,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `author_id` bigint(20) unsigned DEFAULT NULL,
  `author_type` varchar(255) DEFAULT NULL,
  `parent_id` bigint(20) unsigned DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `order` int(11) NOT NULL DEFAULT 0,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `categories_category_code_unique` (`category_code`),
  UNIQUE KEY `categories_order_unique` (`order`),
  KEY `categories_parent_id_foreign` (`parent_id`),
  CONSTRAINT `categories_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `category_product`
--

DROP TABLE IF EXISTS `category_product`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `category_product` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `category_id` bigint(20) unsigned NOT NULL,
  `product_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `category_product_category_id_product_id_unique` (`category_id`,`product_id`),
  KEY `category_product_product_id_foreign` (`product_id`),
  CONSTRAINT `category_product_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `category_product_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `category_product`
--

LOCK TABLES `category_product` WRITE;
/*!40000 ALTER TABLE `category_product` DISABLE KEYS */;
/*!40000 ALTER TABLE `category_product` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cheque_transactions`
--

DROP TABLE IF EXISTS `cheque_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cheque_transactions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `cheque_id` bigint(20) unsigned NOT NULL,
  `action` enum('issue','receive','deposit','clear','return','cancel','created','updated','status_updated') NOT NULL,
  `action_date` date NOT NULL,
  `account_id` bigint(20) unsigned DEFAULT NULL,
  `amount` decimal(18,2) NOT NULL,
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `cheque_transactions_cheque_id_foreign` (`cheque_id`),
  KEY `cheque_transactions_created_by_foreign` (`created_by`),
  KEY `cheque_transactions_account_id_index` (`account_id`),
  CONSTRAINT `cheque_transactions_cheque_id_foreign` FOREIGN KEY (`cheque_id`) REFERENCES `cheques` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cheque_transactions_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cheque_transactions`
--

LOCK TABLES `cheque_transactions` WRITE;
/*!40000 ALTER TABLE `cheque_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `cheque_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cheques`
--

DROP TABLE IF EXISTS `cheques`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cheques` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `cheque_no` varchar(100) NOT NULL,
  `bank_name` varchar(150) NOT NULL,
  `account_id` bigint(20) unsigned DEFAULT NULL,
  `owner_name` varchar(150) DEFAULT NULL,
  `cheque_type` enum('received','issued') NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `issue_date` date NOT NULL,
  `due_date` date NOT NULL,
  `status` enum('pending','cleared','returned','cancelled','deposited') NOT NULL DEFAULT 'pending',
  `reference_no` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cheques_cheque_no_unique` (`cheque_no`),
  KEY `cheques_created_by_foreign` (`created_by`),
  KEY `cheques_updated_by_foreign` (`updated_by`),
  KEY `cheques_account_id_index` (`account_id`),
  CONSTRAINT `cheques_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `cheques_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cheques`
--

LOCK TABLES `cheques` WRITE;
/*!40000 ALTER TABLE `cheques` DISABLE KEYS */;
/*!40000 ALTER TABLE `cheques` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cities`
--

DROP TABLE IF EXISTS `cities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cities` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `country_id` bigint(20) unsigned NOT NULL,
  `code` varchar(255) DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `cities_country_id_foreign` (`country_id`),
  CONSTRAINT `cities_country_id_foreign` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cities`
--

LOCK TABLES `cities` WRITE;
/*!40000 ALTER TABLE `cities` DISABLE KEYS */;
/*!40000 ALTER TABLE `cities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `commission_rates`
--

DROP TABLE IF EXISTS `commission_rates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `commission_rates` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `sales_agent_id` int(10) unsigned DEFAULT NULL,
  `product_category_id` bigint(20) unsigned DEFAULT NULL,
  `min_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `max_amount` decimal(15,2) DEFAULT NULL,
  `commission_rate` decimal(5,2) NOT NULL,
  `effective_date` date NOT NULL,
  `expiry_date` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `commission_rates_sales_agent_id_foreign` (`sales_agent_id`),
  KEY `commission_rates_product_category_id_foreign` (`product_category_id`),
  CONSTRAINT `commission_rates_product_category_id_foreign` FOREIGN KEY (`product_category_id`) REFERENCES `categories` (`id`),
  CONSTRAINT `commission_rates_sales_agent_id_foreign` FOREIGN KEY (`sales_agent_id`) REFERENCES `sales_agents` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `commission_rates`
--

LOCK TABLES `commission_rates` WRITE;
/*!40000 ALTER TABLE `commission_rates` DISABLE KEYS */;
/*!40000 ALTER TABLE `commission_rates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `companies`
--

DROP TABLE IF EXISTS `companies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `companies` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_code` varchar(50) NOT NULL,
  `tax_id` varchar(50) DEFAULT NULL,
  `commercial_registration` varchar(100) DEFAULT NULL,
  `legal_form` enum('llc','joint_stock','partnership','sole_proprietorship','branch','subsidiary','government','non_profit') NOT NULL DEFAULT 'llc',
  `legal_name_ar` varchar(200) NOT NULL,
  `legal_name_en` varchar(200) DEFAULT NULL,
  `trade_name_ar` varchar(200) DEFAULT NULL,
  `trade_name_en` varchar(200) DEFAULT NULL,
  `sector_id` bigint(20) unsigned DEFAULT NULL,
  `industry_id` bigint(20) unsigned DEFAULT NULL,
  `sub_industry_id` bigint(20) unsigned DEFAULT NULL,
  `company_size` enum('micro','small','medium','large','enterprise') NOT NULL DEFAULT 'medium',
  `country_id` bigint(20) unsigned NOT NULL,
  `state_id` bigint(20) unsigned DEFAULT NULL,
  `city_id` bigint(20) unsigned DEFAULT NULL,
  `address_ar` varchar(500) DEFAULT NULL,
  `address_en` varchar(500) DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `fax` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `website` varchar(500) DEFAULT NULL,
  `ceo_name_ar` varchar(200) DEFAULT NULL,
  `ceo_name_en` varchar(200) DEFAULT NULL,
  `chairman_name_ar` varchar(200) DEFAULT NULL,
  `chairman_name_en` varchar(200) DEFAULT NULL,
  `contact_person_ar` varchar(200) DEFAULT NULL,
  `contact_person_en` varchar(200) DEFAULT NULL,
  `fiscal_year_end_month` int(11) NOT NULL DEFAULT 12,
  `reporting_currency_id` bigint(20) unsigned DEFAULT NULL,
  `paid_up_capital` decimal(20,4) DEFAULT NULL,
  `authorized_capital` decimal(20,4) DEFAULT NULL,
  `annual_revenue` decimal(20,4) DEFAULT NULL,
  `number_of_employees` int(11) DEFAULT NULL,
  `is_public` tinyint(1) NOT NULL DEFAULT 0,
  `exchange_id` bigint(20) unsigned DEFAULT NULL,
  `ticker_symbol` varchar(20) DEFAULT NULL,
  `ipo_date` date DEFAULT NULL,
  `market_cap` decimal(20,4) DEFAULT NULL,
  `credit_rating_id` bigint(20) unsigned DEFAULT NULL,
  `credit_score` int(11) DEFAULT NULL,
  `rating_outlook` enum('positive','stable','negative','watch') NOT NULL DEFAULT 'stable',
  `tax_group_id` bigint(20) unsigned DEFAULT NULL,
  `vat_registration_number` varchar(50) DEFAULT NULL,
  `is_vat_registered` tinyint(1) NOT NULL DEFAULT 0,
  `default_bank_account_id` bigint(20) unsigned DEFAULT NULL,
  `payment_terms_id` bigint(20) unsigned DEFAULT NULL,
  `status` enum('active','inactive','suspended','bankrupt','dissolved') NOT NULL DEFAULT 'active',
  `is_customer` tinyint(1) NOT NULL DEFAULT 0,
  `is_vendor` tinyint(1) NOT NULL DEFAULT 0,
  `is_competitor` tinyint(1) NOT NULL DEFAULT 0,
  `logo_path` varchar(500) DEFAULT NULL,
  `registration_certificate_path` varchar(500) DEFAULT NULL,
  `tax_certificate_path` varchar(500) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `internal_rating` enum('A','B','C','D') NOT NULL DEFAULT 'B',
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `verified_at` date DEFAULT NULL,
  `verified_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `companies_company_code_unique` (`company_code`),
  KEY `companies_sector_id_foreign` (`sector_id`),
  KEY `companies_industry_id_foreign` (`industry_id`),
  KEY `companies_sub_industry_id_foreign` (`sub_industry_id`),
  KEY `companies_state_id_foreign` (`state_id`),
  KEY `companies_city_id_foreign` (`city_id`),
  KEY `companies_reporting_currency_id_foreign` (`reporting_currency_id`),
  KEY `companies_exchange_id_foreign` (`exchange_id`),
  KEY `companies_credit_rating_id_foreign` (`credit_rating_id`),
  KEY `companies_tax_group_id_foreign` (`tax_group_id`),
  KEY `companies_default_bank_account_id_foreign` (`default_bank_account_id`),
  KEY `companies_payment_terms_id_foreign` (`payment_terms_id`),
  KEY `idx_country_sector` (`country_id`,`sector_id`),
  KEY `idx_status_size` (`status`,`company_size`),
  KEY `idx_tax_id` (`tax_id`),
  KEY `idx_commercial_reg` (`commercial_registration`),
  KEY `idx_is_public` (`is_public`),
  CONSTRAINT `companies_city_id_foreign` FOREIGN KEY (`city_id`) REFERENCES `cities` (`id`),
  CONSTRAINT `companies_country_id_foreign` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`),
  CONSTRAINT `companies_credit_rating_id_foreign` FOREIGN KEY (`credit_rating_id`) REFERENCES `credit_ratings` (`id`),
  CONSTRAINT `companies_default_bank_account_id_foreign` FOREIGN KEY (`default_bank_account_id`) REFERENCES `bank_accounts` (`id`),
  CONSTRAINT `companies_exchange_id_foreign` FOREIGN KEY (`exchange_id`) REFERENCES `exchanges` (`id`),
  CONSTRAINT `companies_industry_id_foreign` FOREIGN KEY (`industry_id`) REFERENCES `industries` (`id`),
  CONSTRAINT `companies_payment_terms_id_foreign` FOREIGN KEY (`payment_terms_id`) REFERENCES `payment_terms` (`id`),
  CONSTRAINT `companies_reporting_currency_id_foreign` FOREIGN KEY (`reporting_currency_id`) REFERENCES `currencies` (`id`),
  CONSTRAINT `companies_sector_id_foreign` FOREIGN KEY (`sector_id`) REFERENCES `sectors` (`id`),
  CONSTRAINT `companies_state_id_foreign` FOREIGN KEY (`state_id`) REFERENCES `states` (`id`),
  CONSTRAINT `companies_sub_industry_id_foreign` FOREIGN KEY (`sub_industry_id`) REFERENCES `sub_industries` (`id`),
  CONSTRAINT `companies_tax_group_id_foreign` FOREIGN KEY (`tax_group_id`) REFERENCES `tax_groups` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `companies`
--

LOCK TABLES `companies` WRITE;
/*!40000 ALTER TABLE `companies` DISABLE KEYS */;
/*!40000 ALTER TABLE `companies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `company`
--

DROP TABLE IF EXISTS `company`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `company` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_code` varchar(255) DEFAULT NULL,
  `company_name` varchar(255) NOT NULL,
  `english_name` varchar(255) DEFAULT NULL,
  `company_type` varchar(255) DEFAULT NULL,
  `job_title` varchar(255) DEFAULT NULL,
  `mobile` varchar(255) DEFAULT NULL,
  `country` varchar(255) DEFAULT NULL,
  `city` varchar(255) DEFAULT NULL,
  `area` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `logo` varchar(255) DEFAULT NULL,
  `accountant_name` varchar(255) DEFAULT NULL,
  `commercial_registration` varchar(255) DEFAULT NULL,
  `tax_number` varchar(255) DEFAULT NULL,
  `vat_number` varchar(255) DEFAULT NULL,
  `date_of_establishment` date DEFAULT NULL,
  `social_insurance_number` varchar(255) DEFAULT NULL,
  `annual_goals` text DEFAULT NULL,
  `storage` varchar(255) DEFAULT NULL,
  `work_center` varchar(255) DEFAULT NULL,
  `subsidiary_company` varchar(255) DEFAULT NULL,
  `email_address` varchar(255) DEFAULT NULL,
  `official_email` varchar(255) DEFAULT NULL,
  `facebook` varchar(255) DEFAULT NULL,
  `telegram` varchar(255) DEFAULT NULL,
  `youtube` varchar(255) DEFAULT NULL,
  `instagram` varchar(255) DEFAULT NULL,
  `account_holder_name` varchar(255) DEFAULT NULL,
  `bank_name` varchar(255) DEFAULT NULL,
  `iban` varchar(255) DEFAULT NULL,
  `branch_name` varchar(255) DEFAULT NULL,
  `swift_bic` varchar(255) DEFAULT NULL,
  `bank_address` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `company`
--

LOCK TABLES `company` WRITE;
/*!40000 ALTER TABLE `company` DISABLE KEYS */;
/*!40000 ALTER TABLE `company` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `countries`
--

DROP TABLE IF EXISTS `countries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `countries` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `name_ar` varchar(255) DEFAULT NULL,
  `name_en` varchar(255) DEFAULT NULL,
  `code` varchar(255) DEFAULT NULL,
  `currency` varchar(255) DEFAULT NULL,
  `currency_id` bigint(20) unsigned DEFAULT NULL,
  `default_language` varchar(5) NOT NULL DEFAULT 'ar',
  `timezone` varchar(255) DEFAULT NULL,
  `phone_code` varchar(255) DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `countries_currency_id_foreign` (`currency_id`),
  CONSTRAINT `countries_currency_id_foreign` FOREIGN KEY (`currency_id`) REFERENCES `currencies` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `countries`
--

LOCK TABLES `countries` WRITE;
/*!40000 ALTER TABLE `countries` DISABLE KEYS */;
/*!40000 ALTER TABLE `countries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `country_configs`
--

DROP TABLE IF EXISTS `country_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `country_configs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `country_id` bigint(20) unsigned NOT NULL,
  `default_language` varchar(255) NOT NULL DEFAULT 'en',
  `default_currency` varchar(255) NOT NULL DEFAULT 'USD',
  `tax_percentage` decimal(5,2) NOT NULL DEFAULT 0.00,
  `shipping_rules` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`shipping_rules`)),
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `country_configs_country_id_foreign` (`country_id`),
  CONSTRAINT `country_configs_country_id_foreign` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `country_configs`
--

LOCK TABLES `country_configs` WRITE;
/*!40000 ALTER TABLE `country_configs` DISABLE KEYS */;
/*!40000 ALTER TABLE `country_configs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `credit_rating_agencies`
--

DROP TABLE IF EXISTS `credit_rating_agencies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `credit_rating_agencies` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `agency_code` varchar(20) NOT NULL,
  `global_identifier` varchar(50) DEFAULT NULL,
  `acronym` varchar(20) DEFAULT NULL,
  `agency_name_ar` varchar(200) NOT NULL,
  `agency_name_en` varchar(200) NOT NULL,
  `legal_name_ar` varchar(200) DEFAULT NULL,
  `legal_name_en` varchar(200) DEFAULT NULL,
  `agency_type` enum('global','regional','national','specialized') NOT NULL DEFAULT 'global',
  `recognition_status` enum('recognized','registered','unregulated','blacklisted') NOT NULL DEFAULT 'recognized',
  `regulatory_authority` varchar(200) DEFAULT NULL,
  `country_id` bigint(20) unsigned NOT NULL,
  `state_id` bigint(20) unsigned DEFAULT NULL,
  `city_id` bigint(20) unsigned DEFAULT NULL,
  `headquarters_address_ar` varchar(500) DEFAULT NULL,
  `headquarters_address_en` varchar(500) DEFAULT NULL,
  `global_offices_count` int(11) NOT NULL DEFAULT 1,
  `phone` varchar(50) DEFAULT NULL,
  `fax` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `website` varchar(500) DEFAULT NULL,
  `media_contact` varchar(200) DEFAULT NULL,
  `ceo_name_ar` varchar(200) DEFAULT NULL,
  `ceo_name_en` varchar(200) DEFAULT NULL,
  `chairman_name_ar` varchar(200) DEFAULT NULL,
  `chairman_name_en` varchar(200) DEFAULT NULL,
  `head_of_ratings_ar` varchar(200) DEFAULT NULL,
  `head_of_ratings_en` varchar(200) DEFAULT NULL,
  `licenses` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`licenses`)),
  `jurisdictions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`jurisdictions`)),
  `recognition_date` date DEFAULT NULL,
  `recognition_expiry` date DEFAULT NULL,
  `rating_scales` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`rating_scales`)),
  `rating_methodology` text DEFAULT NULL,
  `surveillance_frequency` enum('continuous','monthly','quarterly','semi_annual','annual') NOT NULL DEFAULT 'continuous',
  `specialties` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`specialties`)),
  `coverage_countries` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`coverage_countries`)),
  `sectors_covered` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`sectors_covered`)),
  `number_of_rated_entities` int(11) NOT NULL DEFAULT 0,
  `number_of_rating_actions` int(11) NOT NULL DEFAULT 0,
  `market_share_percent` decimal(5,2) DEFAULT NULL,
  `independence_statement` text DEFAULT NULL,
  `conflict_of_interest_policy` text DEFAULT NULL,
  `code_of_conduct_path` varchar(500) DEFAULT NULL,
  `license_document_path` varchar(500) DEFAULT NULL,
  `recognition_certificate_path` varchar(500) DEFAULT NULL,
  `methodology_document_path` varchar(500) DEFAULT NULL,
  `external_rating` varchar(10) DEFAULT NULL,
  `reliability_score` int(11) DEFAULT NULL,
  `accuracy_rate` decimal(5,2) DEFAULT NULL,
  `status` enum('active','suspended','revoked','derecognized','inactive') NOT NULL DEFAULT 'active',
  `is_accepted` tinyint(1) NOT NULL DEFAULT 1,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `approved_by` bigint(20) unsigned DEFAULT NULL,
  `accepted_by` bigint(20) unsigned DEFAULT NULL,
  `acceptance_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `credit_rating_agencies_agency_code_unique` (`agency_code`),
  KEY `credit_rating_agencies_state_id_foreign` (`state_id`),
  KEY `credit_rating_agencies_city_id_foreign` (`city_id`),
  KEY `idx_country_type` (`country_id`,`agency_type`),
  KEY `idx_recognition_status` (`recognition_status`),
  KEY `idx_is_accepted` (`is_accepted`),
  KEY `idx_status_active` (`status`,`is_accepted`),
  KEY `idx_acronym` (`acronym`),
  CONSTRAINT `credit_rating_agencies_city_id_foreign` FOREIGN KEY (`city_id`) REFERENCES `cities` (`id`),
  CONSTRAINT `credit_rating_agencies_country_id_foreign` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`),
  CONSTRAINT `credit_rating_agencies_state_id_foreign` FOREIGN KEY (`state_id`) REFERENCES `states` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `credit_rating_agencies`
--

LOCK TABLES `credit_rating_agencies` WRITE;
/*!40000 ALTER TABLE `credit_rating_agencies` DISABLE KEYS */;
/*!40000 ALTER TABLE `credit_rating_agencies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `credit_ratings`
--

DROP TABLE IF EXISTS `credit_ratings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `credit_ratings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `rating_agency_id` bigint(20) unsigned NOT NULL,
  `rating_scale` varchar(20) NOT NULL,
  `rating_symbol` varchar(10) NOT NULL,
  `rating_description_ar` varchar(200) NOT NULL,
  `rating_description_en` varchar(200) NOT NULL,
  `risk_level` enum('minimal','low','moderate','high','substantial','default') NOT NULL DEFAULT 'moderate',
  `investment_grade` tinyint(1) NOT NULL DEFAULT 1,
  `outlook` enum('positive','stable','negative','developing','n.m.') NOT NULL DEFAULT 'stable',
  `probability_of_default` decimal(10,8) DEFAULT NULL,
  `expected_loss_given_default` decimal(10,4) DEFAULT NULL,
  `recovery_rate` decimal(10,4) DEFAULT NULL,
  `financial_strength_score` int(11) DEFAULT NULL,
  `business_risk_score` int(11) DEFAULT NULL,
  `industry_position_score` int(11) DEFAULT NULL,
  `equivalent_moody_rating` varchar(10) DEFAULT NULL,
  `equivalent_sp_rating` varchar(10) DEFAULT NULL,
  `equivalent_fitch_rating` varchar(10) DEFAULT NULL,
  `effective_date` date NOT NULL,
  `expiry_date` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_default_scale` tinyint(1) NOT NULL DEFAULT 0,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_agency_rating` (`rating_agency_id`,`rating_scale`,`rating_symbol`),
  KEY `idx_rating_symbol` (`rating_symbol`),
  KEY `idx_investment_grade` (`investment_grade`),
  KEY `idx_risk_level` (`risk_level`),
  KEY `idx_effective_date` (`effective_date`,`expiry_date`),
  CONSTRAINT `credit_ratings_rating_agency_id_foreign` FOREIGN KEY (`rating_agency_id`) REFERENCES `credit_rating_agencies` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `credit_ratings`
--

LOCK TABLES `credit_ratings` WRITE;
/*!40000 ALTER TABLE `credit_ratings` DISABLE KEYS */;
/*!40000 ALTER TABLE `credit_ratings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cross_border_taxes`
--

DROP TABLE IF EXISTS `cross_border_taxes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cross_border_taxes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `transaction_type` enum('export','import','intra_community','reverse_charge') NOT NULL,
  `source_country_id` bigint(20) unsigned NOT NULL,
  `destination_country_id` bigint(20) unsigned NOT NULL,
  `applicable_tax_id` bigint(20) unsigned DEFAULT NULL,
  `tax_rate` decimal(10,4) DEFAULT NULL,
  `tax_treatment` enum('exempt','zero_rated','standard','reduced','special') NOT NULL,
  `required_documents` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`required_documents`)),
  `certificate_requirements` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_border_tax` (`source_country_id`,`destination_country_id`,`transaction_type`),
  KEY `cross_border_taxes_destination_country_id_foreign` (`destination_country_id`),
  KEY `cross_border_taxes_applicable_tax_id_foreign` (`applicable_tax_id`),
  KEY `idx_transaction_type` (`transaction_type`),
  CONSTRAINT `cross_border_taxes_applicable_tax_id_foreign` FOREIGN KEY (`applicable_tax_id`) REFERENCES `taxes` (`id`),
  CONSTRAINT `cross_border_taxes_destination_country_id_foreign` FOREIGN KEY (`destination_country_id`) REFERENCES `countries` (`id`),
  CONSTRAINT `cross_border_taxes_source_country_id_foreign` FOREIGN KEY (`source_country_id`) REFERENCES `countries` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cross_border_taxes`
--

LOCK TABLES `cross_border_taxes` WRITE;
/*!40000 ALTER TABLE `cross_border_taxes` DISABLE KEYS */;
/*!40000 ALTER TABLE `cross_border_taxes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `currencies`
--

DROP TABLE IF EXISTS `currencies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `currencies` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(10) NOT NULL,
  `name` varchar(100) NOT NULL,
  `symbol` varchar(10) DEFAULT NULL,
  `decimal_places` tinyint(4) NOT NULL DEFAULT 2,
  `format` varchar(50) DEFAULT NULL,
  `is_base` tinyint(1) NOT NULL DEFAULT 0,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `currencies_code_unique` (`code`),
  KEY `currencies_created_by_foreign` (`created_by`),
  KEY `currencies_updated_by_foreign` (`updated_by`),
  CONSTRAINT `currencies_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `currencies_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `currencies`
--

LOCK TABLES `currencies` WRITE;
/*!40000 ALTER TABLE `currencies` DISABLE KEYS */;
INSERT INTO `currencies` VALUES (1,'EGP','Egyptian Pound','E£',2,NULL,1,'active',NULL,NULL,NULL,'2026-03-05 10:06:53','2026-03-05 10:06:53');
/*!40000 ALTER TABLE `currencies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_addresses`
--

DROP TABLE IF EXISTS `customer_addresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `customer_addresses` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` int(10) unsigned NOT NULL,
  `address_type` enum('home','billing','shipping','work','other') NOT NULL DEFAULT 'home',
  `address_name` varchar(100) DEFAULT NULL,
  `country_id` bigint(20) unsigned DEFAULT NULL,
  `city_id` bigint(20) unsigned DEFAULT NULL,
  `district` varchar(100) DEFAULT NULL,
  `street` varchar(255) DEFAULT NULL,
  `building_number` varchar(50) DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `po_box` varchar(50) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `mobile` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `is_default_billing` tinyint(1) NOT NULL DEFAULT 0,
  `is_default_shipping` tinyint(1) NOT NULL DEFAULT 0,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `customer_addresses_country_id_foreign` (`country_id`),
  KEY `customer_addresses_city_id_foreign` (`city_id`),
  KEY `idx_customer_addresses_customer` (`customer_id`),
  KEY `idx_customer_addresses_type` (`address_type`),
  CONSTRAINT `customer_addresses_city_id_foreign` FOREIGN KEY (`city_id`) REFERENCES `cities` (`id`) ON DELETE SET NULL,
  CONSTRAINT `customer_addresses_country_id_foreign` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`) ON DELETE SET NULL,
  CONSTRAINT `customer_addresses_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_addresses`
--

LOCK TABLES `customer_addresses` WRITE;
/*!40000 ALTER TABLE `customer_addresses` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_addresses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_contacts`
--

DROP TABLE IF EXISTS `customer_contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `customer_contacts` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` int(10) unsigned NOT NULL,
  `name_ar` varchar(255) NOT NULL,
  `name_en` varchar(255) DEFAULT NULL,
  `position_ar` varchar(100) DEFAULT NULL,
  `position_en` varchar(100) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `mobile` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `whatsapp` varchar(20) DEFAULT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `is_decision_maker` tinyint(1) NOT NULL DEFAULT 0,
  `receive_statements` tinyint(1) NOT NULL DEFAULT 0,
  `receive_marketing` tinyint(1) NOT NULL DEFAULT 0,
  `notes` text DEFAULT NULL,
  `birthday` date DEFAULT NULL,
  `anniversary` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_customer_contacts_customer` (`customer_id`),
  KEY `idx_customer_contacts_primary` (`is_primary`),
  CONSTRAINT `customer_contacts_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_contacts`
--

LOCK TABLES `customer_contacts` WRITE;
/*!40000 ALTER TABLE `customer_contacts` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_contacts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_groups`
--

DROP TABLE IF EXISTS `customer_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `customer_groups` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `name_ar` varchar(100) NOT NULL,
  `name_en` varchar(100) DEFAULT NULL,
  `parent_id` int(10) unsigned DEFAULT NULL,
  `account_id` int(10) unsigned DEFAULT NULL,
  `price_list_id` int(10) unsigned DEFAULT NULL,
  `credit_limit` decimal(15,2) NOT NULL DEFAULT 0.00,
  `payment_terms` int(11) NOT NULL DEFAULT 30,
  `discount_percentage` decimal(5,2) NOT NULL DEFAULT 0.00,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `notes` text DEFAULT NULL,
  `created_by` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customer_groups_code_unique` (`code`),
  KEY `customer_groups_parent_id_foreign` (`parent_id`),
  KEY `customer_groups_account_id_foreign` (`account_id`),
  KEY `idx_customer_groups_code` (`code`),
  KEY `idx_customer_groups_name` (`name_ar`),
  CONSTRAINT `customer_groups_account_id_foreign` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`AccID`) ON DELETE SET NULL,
  CONSTRAINT `customer_groups_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `customer_groups` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_groups`
--

LOCK TABLES `customer_groups` WRITE;
/*!40000 ALTER TABLE `customer_groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_opening_balances`
--

DROP TABLE IF EXISTS `customer_opening_balances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `customer_opening_balances` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` int(10) unsigned NOT NULL,
  `financial_year` int(11) NOT NULL,
  `opening_date` date NOT NULL,
  `currency_id` bigint(20) unsigned NOT NULL,
  `exchange_rate` decimal(15,6) NOT NULL,
  `debit_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `credit_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `base_debit_amount` decimal(15,2) GENERATED ALWAYS AS (`debit_amount` * `exchange_rate`) STORED,
  `base_credit_amount` decimal(15,2) GENERATED ALWAYS AS (`credit_amount` * `exchange_rate`) STORED,
  `net_balance` decimal(15,2) GENERATED ALWAYS AS (`debit_amount` - `credit_amount`) STORED,
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `approved_by` bigint(20) unsigned DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_customer_year` (`customer_id`,`financial_year`),
  KEY `customer_opening_balances_currency_id_foreign` (`currency_id`),
  KEY `idx_customer_opening_balances_customer` (`customer_id`),
  KEY `idx_customer_opening_balances_year` (`financial_year`),
  CONSTRAINT `customer_opening_balances_currency_id_foreign` FOREIGN KEY (`currency_id`) REFERENCES `currencies` (`id`),
  CONSTRAINT `customer_opening_balances_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_opening_balances`
--

LOCK TABLES `customer_opening_balances` WRITE;
/*!40000 ALTER TABLE `customer_opening_balances` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_opening_balances` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_payment_allocations`
--

DROP TABLE IF EXISTS `customer_payment_allocations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `customer_payment_allocations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `payment_id` int(10) unsigned NOT NULL,
  `invoice_id` bigint(20) unsigned NOT NULL,
  `allocated_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `base_allocated_amount` decimal(15,2) DEFAULT NULL,
  `discount_given` decimal(15,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_payment_invoice` (`payment_id`,`invoice_id`),
  KEY `customer_payment_allocations_payment_id_index` (`payment_id`),
  KEY `customer_payment_allocations_invoice_id_index` (`invoice_id`),
  CONSTRAINT `customer_payment_allocations_invoice_id_foreign` FOREIGN KEY (`invoice_id`) REFERENCES `sales_invoices` (`id`),
  CONSTRAINT `customer_payment_allocations_payment_id_foreign` FOREIGN KEY (`payment_id`) REFERENCES `customer_payments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_payment_allocations`
--

LOCK TABLES `customer_payment_allocations` WRITE;
/*!40000 ALTER TABLE `customer_payment_allocations` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_payment_allocations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_payments`
--

DROP TABLE IF EXISTS `customer_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `customer_payments` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `payment_number` varchar(50) NOT NULL,
  `customer_id` int(10) unsigned NOT NULL,
  `currency_id` bigint(20) unsigned NOT NULL,
  `exchange_rate` decimal(15,6) NOT NULL DEFAULT 1.000000,
  `payment_date` date NOT NULL,
  `payment_method` enum('cash','check','credit_card','bank_transfer','credit_note','other') NOT NULL,
  `amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `base_amount` decimal(15,2) GENERATED ALWAYS AS (`amount` * `exchange_rate`) STORED,
  `payment_type` enum('invoice_payment','advance_payment','credit_payment','adjustment') NOT NULL DEFAULT 'invoice_payment',
  `bank_account_id` bigint(20) unsigned DEFAULT NULL,
  `check_number` varchar(50) DEFAULT NULL,
  `check_date` date DEFAULT NULL,
  `check_due_date` date DEFAULT NULL,
  `credit_card_last_four` varchar(4) DEFAULT NULL,
  `credit_card_type` varchar(50) DEFAULT NULL,
  `transaction_id` varchar(100) DEFAULT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `status` enum('draft','posted','reconciled','cancelled','bounced') NOT NULL DEFAULT 'draft',
  `is_posted` tinyint(1) NOT NULL DEFAULT 0,
  `posted_at` timestamp NULL DEFAULT NULL,
  `posted_by` int(11) DEFAULT NULL,
  `reconciled_at` timestamp NULL DEFAULT NULL,
  `reconciled_by` int(11) DEFAULT NULL,
  `customer_notes` text DEFAULT NULL,
  `internal_notes` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customer_payments_payment_number_unique` (`payment_number`),
  KEY `customer_payments_currency_id_foreign` (`currency_id`),
  KEY `customer_payments_bank_account_id_foreign` (`bank_account_id`),
  KEY `customer_payments_payment_number_index` (`payment_number`),
  KEY `customer_payments_payment_date_index` (`payment_date`),
  KEY `customer_payments_customer_id_index` (`customer_id`),
  KEY `customer_payments_payment_method_index` (`payment_method`),
  KEY `customer_payments_status_index` (`status`),
  CONSTRAINT `customer_payments_bank_account_id_foreign` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`),
  CONSTRAINT `customer_payments_currency_id_foreign` FOREIGN KEY (`currency_id`) REFERENCES `currencies` (`id`),
  CONSTRAINT `customer_payments_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_payments`
--

LOCK TABLES `customer_payments` WRITE;
/*!40000 ALTER TABLE `customer_payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_statement_details`
--

DROP TABLE IF EXISTS `customer_statement_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `customer_statement_details` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `statement_id` int(10) unsigned NOT NULL,
  `transaction_date` date NOT NULL,
  `document_type` enum('invoice','payment','credit_note','debit_note','adjustment') NOT NULL,
  `document_id` bigint(20) unsigned NOT NULL,
  `document_number` varchar(50) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `debit_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `credit_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `balance` decimal(15,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `customer_statement_details_statement_id_index` (`statement_id`),
  KEY `customer_statement_details_document_type_document_id_index` (`document_type`,`document_id`),
  CONSTRAINT `customer_statement_details_statement_id_foreign` FOREIGN KEY (`statement_id`) REFERENCES `customer_statements` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_statement_details`
--

LOCK TABLES `customer_statement_details` WRITE;
/*!40000 ALTER TABLE `customer_statement_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_statement_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_statements`
--

DROP TABLE IF EXISTS `customer_statements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `customer_statements` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `statement_number` varchar(50) NOT NULL,
  `customer_id` int(10) unsigned NOT NULL,
  `currency_id` bigint(20) unsigned NOT NULL,
  `statement_date` date NOT NULL,
  `period_from` date NOT NULL,
  `period_to` date NOT NULL,
  `opening_balance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_invoices` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_payments` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_credit_notes` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_debit_notes` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_adjustments` decimal(15,2) NOT NULL DEFAULT 0.00,
  `closing_balance` decimal(15,2) GENERATED ALWAYS AS (`opening_balance` + `total_invoices` - `total_payments` - `total_credit_notes` + `total_debit_notes` + `total_adjustments`) STORED,
  `base_closing_balance` decimal(15,2) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `is_sent` tinyint(1) NOT NULL DEFAULT 0,
  `sent_date` date DEFAULT NULL,
  `sent_method` enum('email','print','both') DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customer_statements_statement_number_unique` (`statement_number`),
  KEY `customer_statements_currency_id_foreign` (`currency_id`),
  KEY `customer_statements_statement_number_index` (`statement_number`),
  KEY `customer_statements_customer_id_index` (`customer_id`),
  KEY `customer_statements_statement_date_index` (`statement_date`),
  CONSTRAINT `customer_statements_currency_id_foreign` FOREIGN KEY (`currency_id`) REFERENCES `currencies` (`id`),
  CONSTRAINT `customer_statements_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_statements`
--

LOCK TABLES `customer_statements` WRITE;
/*!40000 ALTER TABLE `customer_statements` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_statements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `customers` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `customer_code` varchar(50) NOT NULL,
  `name_ar` varchar(255) NOT NULL,
  `name_en` varchar(255) DEFAULT NULL,
  `customer_group_id` int(10) unsigned NOT NULL,
  `account_id` int(10) unsigned DEFAULT NULL,
  `currency_id` bigint(20) unsigned NOT NULL DEFAULT 1,
  `price_list_id` int(10) unsigned DEFAULT NULL,
  `tax_number` varchar(100) DEFAULT NULL,
  `commercial_register` varchar(100) DEFAULT NULL,
  `credit_limit` decimal(15,2) NOT NULL DEFAULT 0.00,
  `current_balance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `available_credit` decimal(15,2) GENERATED ALWAYS AS (`credit_limit` - `current_balance`) STORED,
  `credit_days` int(11) NOT NULL DEFAULT 30,
  `payment_terms` int(11) NOT NULL DEFAULT 30,
  `default_payment_method` enum('cash','check','credit_card','bank_transfer','credit') NOT NULL DEFAULT 'cash',
  `default_warehouse_id` bigint(20) unsigned DEFAULT NULL,
  `sales_agent_id` int(10) unsigned DEFAULT NULL,
  `country_id` bigint(20) unsigned DEFAULT NULL,
  `city_id` bigint(20) unsigned DEFAULT NULL,
  `primary_phone` varchar(20) DEFAULT NULL,
  `secondary_phone` varchar(20) DEFAULT NULL,
  `mobile` varchar(20) DEFAULT NULL,
  `fax` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `customer_type` enum('individual','company','government','reseller','wholesaler','retailer') NOT NULL DEFAULT 'individual',
  `customer_class` enum('A','B','C','D') NOT NULL DEFAULT 'C',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `rating` tinyint(4) DEFAULT NULL,
  `registration_date` date DEFAULT NULL,
  `last_sale_date` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customers_customer_code_unique` (`customer_code`),
  KEY `customers_account_id_foreign` (`account_id`),
  KEY `customers_currency_id_foreign` (`currency_id`),
  KEY `customers_price_list_id_foreign` (`price_list_id`),
  KEY `customers_default_warehouse_id_foreign` (`default_warehouse_id`),
  KEY `customers_sales_agent_id_foreign` (`sales_agent_id`),
  KEY `customers_country_id_foreign` (`country_id`),
  KEY `customers_city_id_foreign` (`city_id`),
  KEY `idx_customers_code` (`customer_code`),
  KEY `idx_customers_name` (`name_ar`),
  KEY `idx_customers_group` (`customer_group_id`),
  KEY `idx_customers_type` (`customer_type`),
  KEY `idx_customers_active` (`is_active`),
  CONSTRAINT `customers_account_id_foreign` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`AccID`) ON DELETE SET NULL,
  CONSTRAINT `customers_city_id_foreign` FOREIGN KEY (`city_id`) REFERENCES `cities` (`id`) ON DELETE SET NULL,
  CONSTRAINT `customers_country_id_foreign` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`) ON DELETE SET NULL,
  CONSTRAINT `customers_currency_id_foreign` FOREIGN KEY (`currency_id`) REFERENCES `currencies` (`id`),
  CONSTRAINT `customers_customer_group_id_foreign` FOREIGN KEY (`customer_group_id`) REFERENCES `customer_groups` (`id`),
  CONSTRAINT `customers_default_warehouse_id_foreign` FOREIGN KEY (`default_warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE SET NULL,
  CONSTRAINT `customers_price_list_id_foreign` FOREIGN KEY (`price_list_id`) REFERENCES `price_lists` (`id`) ON DELETE SET NULL,
  CONSTRAINT `customers_sales_agent_id_foreign` FOREIGN KEY (`sales_agent_id`) REFERENCES `sales_agents` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_customers_rating` CHECK (`rating` between 1 and 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `delivery_note_details`
--

DROP TABLE IF EXISTS `delivery_note_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `delivery_note_details` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `delivery_note_id` bigint(20) unsigned NOT NULL,
  `invoice_detail_id` bigint(20) unsigned DEFAULT NULL,
  `product_id` bigint(20) unsigned NOT NULL,
  `quantity_delivered` decimal(12,4) NOT NULL,
  `unit_id` bigint(20) unsigned NOT NULL,
  `batch_number` varchar(100) DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `condition` enum('good','damaged','expired') NOT NULL DEFAULT 'good',
  `quality_notes` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `delivery_note_details_delivery_note_id_foreign` (`delivery_note_id`),
  KEY `delivery_note_details_invoice_detail_id_foreign` (`invoice_detail_id`),
  KEY `delivery_note_details_product_id_foreign` (`product_id`),
  KEY `delivery_note_details_unit_id_foreign` (`unit_id`),
  CONSTRAINT `delivery_note_details_delivery_note_id_foreign` FOREIGN KEY (`delivery_note_id`) REFERENCES `delivery_notes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `delivery_note_details_invoice_detail_id_foreign` FOREIGN KEY (`invoice_detail_id`) REFERENCES `sales_invoice_details` (`id`),
  CONSTRAINT `delivery_note_details_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `delivery_note_details_unit_id_foreign` FOREIGN KEY (`unit_id`) REFERENCES `item_units` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `delivery_note_details`
--

LOCK TABLES `delivery_note_details` WRITE;
/*!40000 ALTER TABLE `delivery_note_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `delivery_note_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `delivery_notes`
--

DROP TABLE IF EXISTS `delivery_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `delivery_notes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `delivery_number` varchar(50) NOT NULL,
  `invoice_id` bigint(20) unsigned NOT NULL,
  `order_id` bigint(20) unsigned DEFAULT NULL,
  `customer_id` int(10) unsigned NOT NULL,
  `warehouse_id` bigint(20) unsigned NOT NULL,
  `delivery_date` date NOT NULL,
  `delivery_time` time DEFAULT NULL,
  `delivered_by` int(11) NOT NULL,
  `received_by` varchar(100) DEFAULT NULL,
  `delivery_type` enum('full','partial','return') NOT NULL DEFAULT 'full',
  `shipping_method` varchar(100) DEFAULT NULL,
  `vehicle_number` varchar(50) DEFAULT NULL,
  `driver_name` varchar(100) DEFAULT NULL,
  `driver_phone` varchar(20) DEFAULT NULL,
  `total_items` int(11) NOT NULL DEFAULT 0,
  `total_quantity` decimal(12,4) NOT NULL DEFAULT 0.0000,
  `status` enum('draft','ready','in_transit','delivered','cancelled') NOT NULL DEFAULT 'draft',
  `delivery_status` enum('on_time','delayed','early') NOT NULL DEFAULT 'on_time',
  `signature_data` text DEFAULT NULL,
  `customer_feedback` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `delivery_notes_delivery_number_unique` (`delivery_number`),
  KEY `delivery_notes_invoice_id_foreign` (`invoice_id`),
  KEY `delivery_notes_order_id_foreign` (`order_id`),
  KEY `delivery_notes_customer_id_foreign` (`customer_id`),
  KEY `delivery_notes_warehouse_id_foreign` (`warehouse_id`),
  CONSTRAINT `delivery_notes_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `delivery_notes_invoice_id_foreign` FOREIGN KEY (`invoice_id`) REFERENCES `sales_invoices` (`id`),
  CONSTRAINT `delivery_notes_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `sales_orders` (`id`),
  CONSTRAINT `delivery_notes_warehouse_id_foreign` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `delivery_notes`
--

LOCK TABLES `delivery_notes` WRITE;
/*!40000 ALTER TABLE `delivery_notes` DISABLE KEYS */;
/*!40000 ALTER TABLE `delivery_notes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `departments`
--

DROP TABLE IF EXISTS `departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `departments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name_ar` varchar(100) NOT NULL,
  `name_en` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `manager_id` bigint(20) unsigned DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `departments_manager_id_foreign` (`manager_id`),
  CONSTRAINT `departments_manager_id_foreign` FOREIGN KEY (`manager_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departments`
--

LOCK TABLES `departments` WRITE;
/*!40000 ALTER TABLE `departments` DISABLE KEYS */;
/*!40000 ALTER TABLE `departments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `exchange_rates`
--

DROP TABLE IF EXISTS `exchange_rates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `exchange_rates` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `from_currency_id` bigint(20) unsigned NOT NULL,
  `to_currency_id` bigint(20) unsigned NOT NULL,
  `rate` decimal(18,8) NOT NULL,
  `rate_date` date NOT NULL,
  `source` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `exchange_rates_unique` (`from_currency_id`,`to_currency_id`,`rate_date`),
  KEY `exchange_rates_to_currency_id_foreign` (`to_currency_id`),
  CONSTRAINT `exchange_rates_from_currency_id_foreign` FOREIGN KEY (`from_currency_id`) REFERENCES `currencies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `exchange_rates_to_currency_id_foreign` FOREIGN KEY (`to_currency_id`) REFERENCES `currencies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exchange_rates`
--

LOCK TABLES `exchange_rates` WRITE;
/*!40000 ALTER TABLE `exchange_rates` DISABLE KEYS */;
/*!40000 ALTER TABLE `exchange_rates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `exchanges`
--

DROP TABLE IF EXISTS `exchanges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `exchanges` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name_ar` varchar(255) NOT NULL,
  `name_en` varchar(255) DEFAULT NULL,
  `code` varchar(255) DEFAULT NULL,
  `country` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exchanges`
--

LOCK TABLES `exchanges` WRITE;
/*!40000 ALTER TABLE `exchanges` DISABLE KEYS */;
/*!40000 ALTER TABLE `exchanges` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `failed_jobs`
--

DROP TABLE IF EXISTS `failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `failed_jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) NOT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `failed_jobs`
--

LOCK TABLES `failed_jobs` WRITE;
/*!40000 ALTER TABLE `failed_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `failed_jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `financial_reports`
--

DROP TABLE IF EXISTS `financial_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `financial_reports` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `report_key` varchar(100) NOT NULL,
  `report_name` varchar(255) NOT NULL,
  `category` varchar(150) NOT NULL,
  `route_name` varchar(150) NOT NULL,
  `icon` varchar(100) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `financial_reports_report_key_unique` (`report_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `financial_reports`
--

LOCK TABLES `financial_reports` WRITE;
/*!40000 ALTER TABLE `financial_reports` DISABLE KEYS */;
/*!40000 ALTER TABLE `financial_reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `flash_sale_items`
--

DROP TABLE IF EXISTS `flash_sale_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `flash_sale_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `flash_sale_id` bigint(20) unsigned NOT NULL,
  `product_id` bigint(20) unsigned NOT NULL,
  `price` double DEFAULT NULL,
  `quantity` int(11) DEFAULT NULL,
  `sold` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `flash_sale_items_flash_sale_id_foreign` (`flash_sale_id`),
  KEY `flash_sale_items_product_id_foreign` (`product_id`),
  CONSTRAINT `flash_sale_items_flash_sale_id_foreign` FOREIGN KEY (`flash_sale_id`) REFERENCES `flash_sales` (`id`) ON DELETE CASCADE,
  CONSTRAINT `flash_sale_items_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `flash_sale_items`
--

LOCK TABLES `flash_sale_items` WRITE;
/*!40000 ALTER TABLE `flash_sale_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `flash_sale_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `flash_sales`
--

DROP TABLE IF EXISTS `flash_sales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `flash_sales` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `end_date` datetime NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'published',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `flash_sales`
--

LOCK TABLES `flash_sales` WRITE;
/*!40000 ALTER TABLE `flash_sales` DISABLE KEYS */;
/*!40000 ALTER TABLE `flash_sales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `goods_receipt_details`
--

DROP TABLE IF EXISTS `goods_receipt_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `goods_receipt_details` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `receipt_id` bigint(20) unsigned NOT NULL,
  `invoice_detail_id` bigint(20) unsigned DEFAULT NULL,
  `product_id` bigint(20) unsigned NOT NULL,
  `quantity_received` decimal(12,4) NOT NULL,
  `unit_id` bigint(20) unsigned NOT NULL,
  `unit_cost` decimal(15,4) NOT NULL,
  `batch_number` varchar(100) DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `production_date` date DEFAULT NULL,
  `shelf_location` varchar(50) DEFAULT NULL,
  `quality_status` enum('good','damaged','expired','defective') NOT NULL DEFAULT 'good',
  `quality_notes` text DEFAULT NULL,
  `is_accepted` tinyint(1) NOT NULL DEFAULT 1,
  `accepted_quantity` decimal(12,4) DEFAULT NULL,
  `rejected_quantity` decimal(12,4) DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `goods_receipt_details_invoice_detail_id_foreign` (`invoice_detail_id`),
  KEY `goods_receipt_details_unit_id_foreign` (`unit_id`),
  KEY `idx_receipt_details_receipt` (`receipt_id`),
  KEY `idx_receipt_details_product` (`product_id`),
  KEY `idx_receipt_details_batch` (`batch_number`),
  CONSTRAINT `goods_receipt_details_invoice_detail_id_foreign` FOREIGN KEY (`invoice_detail_id`) REFERENCES `purchase_invoice_details` (`id`),
  CONSTRAINT `goods_receipt_details_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `goods_receipt_details_receipt_id_foreign` FOREIGN KEY (`receipt_id`) REFERENCES `goods_receipts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `goods_receipt_details_unit_id_foreign` FOREIGN KEY (`unit_id`) REFERENCES `item_units` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `goods_receipt_details`
--

LOCK TABLES `goods_receipt_details` WRITE;
/*!40000 ALTER TABLE `goods_receipt_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `goods_receipt_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `goods_receipts`
--

DROP TABLE IF EXISTS `goods_receipts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `goods_receipts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `receipt_number` varchar(50) NOT NULL,
  `order_id` bigint(20) unsigned NOT NULL,
  `invoice_id` bigint(20) unsigned DEFAULT NULL,
  `warehouse_id` bigint(20) unsigned NOT NULL,
  `receipt_date` date NOT NULL,
  `receipt_time` time DEFAULT NULL,
  `received_by` bigint(20) unsigned NOT NULL,
  `checked_by` bigint(20) unsigned DEFAULT NULL,
  `approved_by` bigint(20) unsigned DEFAULT NULL,
  `receipt_type` enum('full','partial','return_receipt') NOT NULL DEFAULT 'partial',
  `total_items` int(11) NOT NULL DEFAULT 0,
  `total_quantity` decimal(12,4) NOT NULL DEFAULT 0.0000,
  `total_value` decimal(15,2) NOT NULL DEFAULT 0.00,
  `status` enum('draft','received','checked','approved','cancelled') NOT NULL DEFAULT 'draft',
  `quality_status` enum('pending','passed','failed','partial') NOT NULL DEFAULT 'pending',
  `notes` text DEFAULT NULL,
  `inspection_notes` text DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `goods_receipts_receipt_number_unique` (`receipt_number`),
  KEY `goods_receipts_invoice_id_foreign` (`invoice_id`),
  KEY `goods_receipts_warehouse_id_foreign` (`warehouse_id`),
  KEY `idx_goods_receipts_number` (`receipt_number`),
  KEY `idx_goods_receipts_date` (`receipt_date`),
  KEY `idx_goods_receipts_order` (`order_id`),
  KEY `idx_goods_receipts_status` (`status`),
  CONSTRAINT `goods_receipts_invoice_id_foreign` FOREIGN KEY (`invoice_id`) REFERENCES `purchase_invoices` (`id`),
  CONSTRAINT `goods_receipts_warehouse_id_foreign` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='إيصالات استلام البضائع من الموردين';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `goods_receipts`
--

LOCK TABLES `goods_receipts` WRITE;
/*!40000 ALTER TABLE `goods_receipts` DISABLE KEYS */;
/*!40000 ALTER TABLE `goods_receipts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `industries`
--

DROP TABLE IF EXISTS `industries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `industries` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `industry_code` varchar(50) NOT NULL,
  `gics_industry_code` varchar(10) DEFAULT NULL,
  `trbc_industry_code` varchar(10) DEFAULT NULL,
  `industry_name_ar` varchar(200) NOT NULL,
  `industry_name_en` varchar(200) NOT NULL,
  `description_ar` text DEFAULT NULL,
  `description_en` text DEFAULT NULL,
  `parent_industry_id` bigint(20) unsigned DEFAULT NULL,
  `level` int(11) NOT NULL DEFAULT 2,
  `path` varchar(500) DEFAULT NULL,
  `capital_intensity` enum('high','medium','low') NOT NULL DEFAULT 'medium',
  `cyclicality` enum('cyclical','defensive','growth','speculative') NOT NULL DEFAULT 'cyclical',
  `regulatory_environment` enum('highly_regulated','moderately_regulated','lightly_regulated') NOT NULL DEFAULT 'moderately_regulated',
  `average_profit_margin` decimal(10,4) DEFAULT NULL,
  `average_roa` decimal(10,4) DEFAULT NULL,
  `average_roe` decimal(10,4) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `display_order` int(11) NOT NULL DEFAULT 0,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `industries_industry_code_unique` (`industry_code`),
  KEY `idx_industry_code` (`industry_code`),
  KEY `idx_gics_industry` (`gics_industry_code`),
  KEY `idx_parent_industry` (`parent_industry_id`),
  CONSTRAINT `industries_parent_industry_id_foreign` FOREIGN KEY (`parent_industry_id`) REFERENCES `industries` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `industries`
--

LOCK TABLES `industries` WRITE;
/*!40000 ALTER TABLE `industries` DISABLE KEYS */;
/*!40000 ALTER TABLE `industries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_attributes`
--

DROP TABLE IF EXISTS `item_attributes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `item_attributes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(120) NOT NULL,
  `slug` varchar(120) DEFAULT NULL,
  `display_layout` varchar(191) NOT NULL DEFAULT 'dropdown',
  `is_searchable` tinyint(3) unsigned NOT NULL DEFAULT 1,
  `is_comparable` tinyint(3) unsigned NOT NULL DEFAULT 1,
  `is_use_in_product_listing` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `status` varchar(60) NOT NULL DEFAULT 'published',
  `order` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `use_image_from_product_variation` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_attributes`
--

LOCK TABLES `item_attributes` WRITE;
/*!40000 ALTER TABLE `item_attributes` DISABLE KEYS */;
/*!40000 ALTER TABLE `item_attributes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_attributes_details`
--

DROP TABLE IF EXISTS `item_attributes_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `item_attributes_details` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `attribute_set_id` bigint(20) unsigned NOT NULL,
  `title` varchar(120) NOT NULL,
  `slug` varchar(120) DEFAULT NULL,
  `color` varchar(120) DEFAULT NULL,
  `image` varchar(191) DEFAULT NULL,
  `is_default` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `order` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `attribute_set_id_index` (`attribute_set_id`),
  CONSTRAINT `item_attributes_details_attribute_set_id_foreign` FOREIGN KEY (`attribute_set_id`) REFERENCES `item_attributes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_attributes_details`
--

LOCK TABLES `item_attributes_details` WRITE;
/*!40000 ALTER TABLE `item_attributes_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `item_attributes_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_unit_conversions`
--

DROP TABLE IF EXISTS `item_unit_conversions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `item_unit_conversions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `from_unit_id` bigint(20) unsigned NOT NULL,
  `to_unit_id` bigint(20) unsigned NOT NULL,
  `conversion_factor` decimal(15,6) NOT NULL COMMENT 'e.g., 1000 means 1 from = 1000 to',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_conversion` (`from_unit_id`,`to_unit_id`),
  KEY `item_unit_conversions_to_unit_id_foreign` (`to_unit_id`),
  CONSTRAINT `item_unit_conversions_from_unit_id_foreign` FOREIGN KEY (`from_unit_id`) REFERENCES `item_units` (`id`) ON DELETE CASCADE,
  CONSTRAINT `item_unit_conversions_to_unit_id_foreign` FOREIGN KEY (`to_unit_id`) REFERENCES `item_units` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_unit_conversions`
--

LOCK TABLES `item_unit_conversions` WRITE;
/*!40000 ALTER TABLE `item_unit_conversions` DISABLE KEYS */;
/*!40000 ALTER TABLE `item_unit_conversions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_units`
--

DROP TABLE IF EXISTS `item_units`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `item_units` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `unit_type` tinyint(4) NOT NULL DEFAULT 1 COMMENT '1=Main, 2=Sub',
  `base_unit` bigint(20) unsigned DEFAULT NULL,
  `conversion_factor` decimal(10,4) NOT NULL DEFAULT 1.0000,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `item_units_base_unit_foreign` (`base_unit`),
  KEY `item_units_created_by_foreign` (`created_by`),
  KEY `item_units_updated_by_foreign` (`updated_by`),
  CONSTRAINT `item_units_base_unit_foreign` FOREIGN KEY (`base_unit`) REFERENCES `item_units` (`id`) ON DELETE CASCADE,
  CONSTRAINT `item_units_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `item_units_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_units`
--

LOCK TABLES `item_units` WRITE;
/*!40000 ALTER TABLE `item_units` DISABLE KEYS */;
/*!40000 ALTER TABLE `item_units` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_batches`
--

DROP TABLE IF EXISTS `job_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `job_batches` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `total_jobs` int(11) NOT NULL,
  `pending_jobs` int(11) NOT NULL,
  `failed_jobs` int(11) NOT NULL,
  `failed_job_ids` longtext NOT NULL,
  `options` mediumtext DEFAULT NULL,
  `cancelled_at` int(11) DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  `finished_at` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_batches`
--

LOCK TABLES `job_batches` WRITE;
/*!40000 ALTER TABLE `job_batches` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jobs`
--

DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) NOT NULL,
  `payload` longtext NOT NULL,
  `attempts` tinyint(3) unsigned NOT NULL,
  `reserved_at` int(10) unsigned DEFAULT NULL,
  `available_at` int(10) unsigned NOT NULL,
  `created_at` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jobs`
--

LOCK TABLES `jobs` WRITE;
/*!40000 ALTER TABLE `jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `journal_entries`
--

DROP TABLE IF EXISTS `journal_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `journal_entries` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `entry_code` varchar(50) DEFAULT NULL,
  `entry_type` varchar(50) DEFAULT 'Qmanual',
  `reference` varchar(500) DEFAULT NULL,
  `date` datetime DEFAULT NULL,
  `description` varchar(500) DEFAULT NULL,
  `total_amount` double NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'UnPost',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `journal_entries`
--

LOCK TABLES `journal_entries` WRITE;
/*!40000 ALTER TABLE `journal_entries` DISABLE KEYS */;
/*!40000 ALTER TABLE `journal_entries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `journal_entry_lines`
--

DROP TABLE IF EXISTS `journal_entry_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `journal_entry_lines` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `journal_entry_code` varchar(100) NOT NULL,
  `account_id` int(11) NOT NULL,
  `debit` double NOT NULL,
  `credit` double NOT NULL,
  `related_id_name` varchar(30) DEFAULT NULL,
  `related_name_details` varchar(100) DEFAULT NULL,
  `description` varchar(500) DEFAULT NULL,
  `cost_center_code` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `journal_entry_lines`
--

LOCK TABLES `journal_entry_lines` WRITE;
/*!40000 ALTER TABLE `journal_entry_lines` DISABLE KEYS */;
/*!40000 ALTER TABLE `journal_entry_lines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `landed_cost_allocations`
--

DROP TABLE IF EXISTS `landed_cost_allocations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `landed_cost_allocations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `landed_cost_id` bigint(20) unsigned NOT NULL,
  `purchase_invoice_detail_id` bigint(20) unsigned NOT NULL,
  `allocated_amount` decimal(15,2) NOT NULL,
  `allocated_per_unit` decimal(15,6) NOT NULL DEFAULT 0.000000,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `landed_cost_allocations_landed_cost_id_foreign` (`landed_cost_id`),
  KEY `landed_cost_allocations_purchase_invoice_detail_id_foreign` (`purchase_invoice_detail_id`),
  CONSTRAINT `landed_cost_allocations_landed_cost_id_foreign` FOREIGN KEY (`landed_cost_id`) REFERENCES `landed_costs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `landed_cost_allocations_purchase_invoice_detail_id_foreign` FOREIGN KEY (`purchase_invoice_detail_id`) REFERENCES `purchase_invoice_details` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `landed_cost_allocations`
--

LOCK TABLES `landed_cost_allocations` WRITE;
/*!40000 ALTER TABLE `landed_cost_allocations` DISABLE KEYS */;
/*!40000 ALTER TABLE `landed_cost_allocations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `landed_cost_details`
--

DROP TABLE IF EXISTS `landed_cost_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `landed_cost_details` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `landed_cost_id` bigint(20) unsigned NOT NULL,
  `purchase_expense_id` bigint(20) unsigned NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `landed_cost_details_landed_cost_id_foreign` (`landed_cost_id`),
  KEY `landed_cost_details_purchase_expense_id_foreign` (`purchase_expense_id`),
  CONSTRAINT `landed_cost_details_landed_cost_id_foreign` FOREIGN KEY (`landed_cost_id`) REFERENCES `landed_costs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `landed_cost_details_purchase_expense_id_foreign` FOREIGN KEY (`purchase_expense_id`) REFERENCES `purchase_expenses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `landed_cost_details`
--

LOCK TABLES `landed_cost_details` WRITE;
/*!40000 ALTER TABLE `landed_cost_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `landed_cost_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `landed_costs`
--

DROP TABLE IF EXISTS `landed_costs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `landed_costs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `reference_number` varchar(50) NOT NULL,
  `allocation_method` enum('value','quantity','weight','manual') NOT NULL,
  `status` enum('draft','allocated','posted','cancelled') NOT NULL DEFAULT 'draft',
  `total_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `currency_id` bigint(20) unsigned DEFAULT NULL,
  `exchange_rate` decimal(15,6) NOT NULL DEFAULT 1.000000,
  `allocated_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `remaining_to_allocate` decimal(15,2) GENERATED ALWAYS AS (`total_amount` - `allocated_amount`) STORED,
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `landed_costs_reference_number_unique` (`reference_number`),
  KEY `landed_costs_currency_id_foreign` (`currency_id`),
  KEY `landed_costs_created_by_foreign` (`created_by`),
  CONSTRAINT `landed_costs_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `landed_costs_currency_id_foreign` FOREIGN KEY (`currency_id`) REFERENCES `currencies` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `landed_costs`
--

LOCK TABLES `landed_costs` WRITE;
/*!40000 ALTER TABLE `landed_costs` DISABLE KEYS */;
/*!40000 ALTER TABLE `landed_costs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `language_lines`
--

DROP TABLE IF EXISTS `language_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `language_lines` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `group` varchar(255) NOT NULL,
  `key` varchar(255) NOT NULL,
  `text` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`text`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `language_lines_group_index` (`group`),
  KEY `language_lines_key_index` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `language_lines`
--

LOCK TABLES `language_lines` WRITE;
/*!40000 ALTER TABLE `language_lines` DISABLE KEYS */;
/*!40000 ALTER TABLE `language_lines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `languages`
--

DROP TABLE IF EXISTS `languages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `languages` (
  `lang_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `lang_name` varchar(120) NOT NULL,
  `lang_locale` varchar(20) NOT NULL,
  `lang_code` varchar(20) NOT NULL,
  `lang_flag` varchar(20) DEFAULT NULL,
  `lang_is_default` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `lang_order` int(11) NOT NULL DEFAULT 0,
  `lang_is_rtl` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`lang_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `languages`
--

LOCK TABLES `languages` WRITE;
/*!40000 ALTER TABLE `languages` DISABLE KEYS */;
/*!40000 ALTER TABLE `languages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `market_prices`
--

DROP TABLE IF EXISTS `market_prices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `market_prices` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `instrument_id` bigint(20) unsigned NOT NULL,
  `bid_price` decimal(20,4) NOT NULL,
  `ask_price` decimal(20,4) NOT NULL,
  `last_price` decimal(20,4) NOT NULL,
  `open_price` decimal(20,4) DEFAULT NULL,
  `high_price` decimal(20,4) DEFAULT NULL,
  `low_price` decimal(20,4) DEFAULT NULL,
  `close_price` decimal(20,4) DEFAULT NULL,
  `price_date` date NOT NULL,
  `price_time` time NOT NULL,
  `price_timestamp` timestamp NOT NULL,
  `bid_volume` decimal(20,2) DEFAULT NULL,
  `ask_volume` decimal(20,2) DEFAULT NULL,
  `volume` decimal(20,2) DEFAULT NULL,
  `change_amount` decimal(20,4) DEFAULT NULL,
  `change_percent` decimal(10,4) DEFAULT NULL,
  `data_source` varchar(100) DEFAULT NULL,
  `is_eod` tinyint(1) NOT NULL DEFAULT 0,
  `is_intraday` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `market_prices_instrument_id_foreign` (`instrument_id`),
  CONSTRAINT `market_prices_instrument_id_foreign` FOREIGN KEY (`instrument_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `market_prices`
--

LOCK TABLES `market_prices` WRITE;
/*!40000 ALTER TABLE `market_prices` DISABLE KEYS */;
/*!40000 ALTER TABLE `market_prices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `media_files`
--

DROP TABLE IF EXISTS `media_files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `media_files` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `folder_id` bigint(20) unsigned DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_type` varchar(50) NOT NULL,
  `size` bigint(20) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `media_files`
--

LOCK TABLES `media_files` WRITE;
/*!40000 ALTER TABLE `media_files` DISABLE KEYS */;
/*!40000 ALTER TABLE `media_files` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `media_folders`
--

DROP TABLE IF EXISTS `media_folders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `media_folders` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `parent_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `media_folders`
--

LOCK TABLES `media_folders` WRITE;
/*!40000 ALTER TABLE `media_folders` DISABLE KEYS */;
/*!40000 ALTER TABLE `media_folders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `migrations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=191 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'0001_01_01_000000_create_users_table',1),(2,'0001_01_01_000001_create_cache_table',1),(3,'0001_01_01_000002_create_jobs_table',1),(4,'2025_12_28_073636_create_countries_table',1),(5,'2025_12_28_073641_create_cities_table',1),(6,'2025_12_28_073648_create_areas_table',1),(7,'2025_12_28_182054_add_coordinates_to_cities_table',1),(8,'2025_12_28_182126_add_coordinates_to_areas_table',1),(9,'2025_12_28_191838_add_employee_fields_to_users_table',1),(10,'2025_12_29_093417_create_task_categories_table',1),(11,'2025_12_29_093432_create_task_priorities_table',1),(12,'2025_12_29_093440_create_task_statuses_table',1),(13,'2025_12_29_093448_create_tasks_table',1),(14,'2025_12_29_093455_create_task_assignments_table',1),(15,'2025_12_29_093503_create_task_comments_table',1),(16,'2025_12_29_093510_create_task_attachments_table',1),(17,'2025_12_30_223032_add_role_to_users_table',1),(18,'2025_12_30_235228_fix_foreign_keys_in_tasks_table',1),(19,'2026_01_06_235958_create_nationalities_table',1),(20,'2026_01_09_105954_create_company_table',1),(21,'2026_01_09_124318_create_branch_infos_table',1),(22,'2026_01_09_143517_create_warehouses_table',1),(23,'2026_01_09_153346_create_categories_table',1),(24,'2026_01_09_160859_create_brands_table',1),(25,'2026_01_09_163217_create_products_table',1),(26,'2026_01_09_201100_create_suppliers_table',1),(27,'2026_01_09_210435_add_auth_fields_to_suppliers_table',1),(28,'2026_01_09_221057_create_product_supplier_table',1),(29,'2026_01_09_233959_create_media_folders_table',1),(30,'2026_01_09_234205_create_media_files_table',1),(31,'2026_01_11_175757_add_columns_to_categories_table',1),(32,'2026_01_11_181538_add_image_to_categories_table',1),(33,'2026_01_11_182448_add_slug_to_categories_table',1),(34,'2026_01_13_165843_add_unique_constraint_to_categories_order',1),(35,'2026_01_14_000000_create_accounts_table',1),(36,'2026_01_14_010000_update_accounts_constraints',1),(37,'2026_01_14_020000_create_tblqaid_table',1),(38,'2026_01_14_020100_create_tblqaidbody_table',1),(39,'2026_01_16_030000_update_tblqaid_qaidtype_default',1),(40,'2026_01_17_150000_rename_columns_in_tblqaidbody',1),(41,'2026_01_17_160000_create_financial_reports_table',1),(42,'2026_01_17_170000_create_user_favorite_reports_table',1),(43,'2026_01_17_180000_create_ads_table',1),(44,'2026_01_18_000000_add_soft_deletes_to_ads_table',1),(45,'2026_01_19_120000_create_category_product_table',1),(46,'2026_01_19_214913_create_item_units_table',1),(47,'2026_01_19_215703_create_item_unit_conversions_table',1),(48,'2026_01_19_233235_create_item_attributes_tables',1),(49,'2026_01_20_090000_create_item_collections_tables',1),(50,'2026_01_20_100000_create_bank_management_tables',1),(51,'2026_01_20_110000_create_cash_management_tables',1),(52,'2026_01_20_120000_create_cheques_tables',1),(53,'2026_01_20_130000_create_currencies_tables',1),(54,'2026_01_20_140000_update_cheque_transaction_action_enum',1),(55,'2026_01_22_050816_recreate_suppliers_table',1),(56,'2026_01_22_051715_create_supplier_addresses_table',1),(57,'2026_01_22_052034_create_supplier_contacts_table',1),(58,'2026_01_22_052344_create_supplier_opening_balances_table',1),(59,'2026_01_22_053643_create_purchase_invoices_table',1),(60,'2026_01_22_054013_create_purchase_invoice_details_table',1),(61,'2026_01_22_054414_create_supplier_payments_table',1),(62,'2026_01_22_054425_create_supplier_payment_allocations_table',1),(63,'2026_01_22_054820_create_supplier_statements_table',1),(64,'2026_01_22_054830_create_supplier_statement_details_table',1),(65,'2026_01_22_063020_create_purchase_discounts_table',1),(66,'2026_01_22_063031_create_purchase_discount_suppliers_table',1),(67,'2026_01_22_063041_create_purchase_taxes_table',1),(68,'2026_01_22_063052_create_goods_receipts_table',1),(69,'2026_01_22_063102_create_goods_receipt_details_table',1),(70,'2026_01_22_064155_create_purchase_returns_table',1),(71,'2026_01_22_064206_create_purchase_return_details_table',1),(72,'2026_01_22_064551_create_purchase_costings_table',1),(73,'2026_01_22_064825_create_purchase_expenses_table',1),(74,'2026_01_22_065254_create_landed_costs_table',1),(75,'2026_01_22_065255_create_landed_cost_allocations_table',1),(76,'2026_01_22_065255_create_landed_cost_details_table',1),(77,'2026_01_22_080000_create_customer_groups_table',1),(78,'2026_01_22_083000_create_price_lists_table',1),(79,'2026_01_22_084000_create_sales_agents_table',1),(80,'2026_01_22_090000_create_customers_table',1),(81,'2026_01_22_093000_create_customer_addresses_table',1),(82,'2026_01_22_100000_create_customer_contacts_table',1),(83,'2026_01_22_110000_create_customer_opening_balances_table',1),(84,'2026_01_22_120000_create_price_list_items_table',1),(85,'2026_01_22_130000_create_sales_quotations_table',1),(86,'2026_01_22_133000_create_sales_quotation_details_table',1),(87,'2026_01_22_140000_create_sales_orders_table',1),(88,'2026_01_22_143000_create_sales_order_details_table',1),(89,'2026_01_22_150000_create_sales_invoices_table',1),(90,'2026_01_22_153000_create_sales_invoice_details_table',1),(91,'2026_01_22_160000_create_delivery_notes_table',1),(92,'2026_01_22_163000_create_delivery_note_details_table',1),(93,'2026_01_22_170000_create_sales_returns_table',1),(94,'2026_01_22_173000_create_sales_return_details_table',1),(95,'2026_01_22_180000_create_sales_commissions_table',1),(96,'2026_01_22_183000_create_commission_rates_table',1),(97,'2026_01_22_190000_create_sales_discounts_table',1),(98,'2026_01_22_193000_create_sales_discount_customers_table',1),(99,'2026_01_22_200000_create_sales_taxes_table',1),(100,'2026_01_22_203000_create_customer_payments_table',1),(101,'2026_01_22_203500_create_customer_payment_allocations_table',1),(102,'2026_01_22_210000_create_customer_statements_tables',1),(103,'2026_01_23_000000_create_asset_categories_table',1),(104,'2026_01_23_000000_rename_branch_infos_to_branches',1),(105,'2026_01_23_000000_rename_journal_tables',1),(106,'2026_01_23_000001_create_departments_table',1),(107,'2026_01_23_000002_create_assets_table',1),(108,'2026_01_23_000003_create_attributes_table',1),(109,'2026_01_23_000004_create_asset_attributes_table',1),(110,'2026_01_23_000005_create_asset_depreciation_table',1),(111,'2026_01_23_000006_create_asset_revaluation_table',1),(112,'2026_01_23_000007_create_asset_disposals_table',1),(113,'2026_01_23_000008_create_asset_maintenance_table',1),(114,'2026_01_23_000009_create_asset_movements_table',1),(115,'2026_01_23_000010_create_asset_inspections_table',1),(116,'2026_01_23_060000_create_global_tax_types_table',1),(117,'2026_01_23_061049_rename_company_infos_to_companies_table',1),(118,'2026_01_23_070000_create_taxes_table',1),(119,'2026_01_23_080000_create_tax_groups_table',1),(120,'2026_01_23_090000_create_tax_group_details_table',1),(121,'2026_01_23_100000_create_tax_rules_table',1),(122,'2026_01_23_110000_create_tax_exemptions_table',1),(123,'2026_01_23_120000_create_tax_periods_table',1),(124,'2026_01_23_130000_create_tax_returns_table',1),(125,'2026_01_23_140000_create_tax_payments_table',1),(126,'2026_01_23_150000_create_tax_invoices_table',1),(127,'2026_01_23_160000_create_tax_invoice_details_table',1),(128,'2026_01_23_170000_create_tax_withholdings_table',1),(129,'2026_01_23_180000_create_cross_border_taxes_table',1),(130,'2026_01_23_190000_create_tax_settlements_table',1),(131,'2026_01_23_200000_create_tax_audit_log_table',1),(132,'2026_01_23_210000_create_budget_categories_table',1),(133,'2026_01_23_210100_create_budgets_table',1),(134,'2026_01_23_210200_create_budget_items_table',1),(135,'2026_01_23_210300_create_budget_forecasts_table',1),(136,'2026_01_23_210400_create_budget_monitoring_table',1),(137,'2026_01_23_210500_create_budget_transfers_table',1),(138,'2026_01_23_210600_create_budget_commitments_table',1),(139,'2026_01_23_210700_create_budget_reports_table',1),(140,'2026_01_23_210800_create_budget_approvals_table',1),(141,'2026_01_23_210900_create_budget_templates_table',1),(142,'2026_01_23_211000_create_budget_analysis_table',1),(143,'2026_01_23_211100_create_budget_allocation_logs_table',1),(144,'2026_01_24_000000_create_supplier_groups_table',1),(145,'2026_01_24_000001_create_purchase_quotations_table',1),(146,'2026_01_24_000002_create_purchase_quotation_items_table',1),(147,'2026_01_24_120000_recreate_sales_commissions_and_commission_rates',1),(148,'2026_01_24_200005_create_purchase_orders_table',1),(149,'2026_01_24_200006_create_purchase_order_items_table',1),(150,'2026_01_24_999999_drop_purchase_quotations_table',1),(151,'2026_01_26_213058_add_favorite_to_suppliers_table',1),(152,'2026_01_26_214429_rename_email_to_telegram_in_suppliers_table',1),(153,'2026_01_26_214843_rename_email_to_telegram_in_supplier_contacts_table',1),(154,'2026_01_26_224157_rename_email_to_telegram_in_supplier_contacts_table',1),(155,'2026_01_27_000000_revert_telegram_to_email',1),(156,'2026_01_28_000000_create_investing_stack_dependencies',1),(157,'2026_01_28_000001_create_companies_table',1),(158,'2026_01_28_000002_create_brokers_table',1),(159,'2026_01_28_000003_create_credit_rating_agencies_table',1),(160,'2026_01_28_000005_create_industries_table',1),(161,'2026_01_28_000006_create_credit_ratings_table',1),(162,'2026_01_28_000007_create_sub_industries_table',1),(163,'2026_01_28_100848_add_multilingual_names_to_countries_table',1),(164,'2026_01_29_213900_add_destination_budget_item_id_to_budget_forecasts_table',1),(165,'2026_02_02_194946_drop_sector_id_from_industries_table',1),(166,'2026_02_02_200000_create_market_prices_table',1),(167,'2026_02_02_203000_drop_sector_id_from_industries',1),(168,'2026_02_09_000000_change_journal_date_to_datetime',1),(169,'2026_02_21_011105_create_product_variations_tables',1),(170,'2026_02_21_120000_update_products_storeid_to_suppliercode',1),(171,'2026_02_22_010000_add_image_to_product_variations_table',1),(172,'2026_02_22_012000_fix_product_variation_items_foreign_key',1),(173,'2026_02_22_020500_drop_category_id_from_products_table',1),(174,'2026_02_23_120000_drop_columns_from_product_variations_table',1),(175,'2026_02_24_031327_add_password_to_customers_table',1),(176,'2026_02_24_033213_fix_suppliers_fks_and_restore_pivot',1),(177,'2026_02_24_085013_enterprise_global_marketplace_structure',1),(178,'2026_02_24_085927_enhance_countries_table_for_enterprise',1),(179,'2026_02_24_090052_create_vendor_wallets_table',1),(180,'2026_02_24_090058_create_vendor_wallet_transactions_table',1),(181,'2026_02_24_162930_create_languages_table',1),(182,'2026_02_24_171948_create_language_lines_table',1),(183,'2026_02_26_235337_create_flash_sales_table',1),(184,'2026_02_26_235350_create_flash_sale_items_table',1),(185,'2026_02_27_231646_create_product_collections_table',1),(186,'2026_02_27_231956_create_product_collection_products_table',1),(187,'2026_02_27_233702_drop_item_collections_tables',1),(188,'2026_03_02_054631_create_product_collections_translations_table',1),(189,'2026_03_05_120000_fix_suppliers_schema',1),(190,'2026_03_05_233712_create_roles_table',2);
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `nationalities`
--

DROP TABLE IF EXISTS `nationalities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `nationalities` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `country_code` varchar(255) NOT NULL,
  `region` varchar(255) DEFAULT NULL,
  `currency` varchar(255) DEFAULT NULL,
  `language` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nationalities`
--

LOCK TABLES `nationalities` WRITE;
/*!40000 ALTER TABLE `nationalities` DISABLE KEYS */;
/*!40000 ALTER TABLE `nationalities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_terms`
--

DROP TABLE IF EXISTS `payment_terms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payment_terms` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name_ar` varchar(255) NOT NULL,
  `name_en` varchar(255) DEFAULT NULL,
  `days` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_terms`
--

LOCK TABLES `payment_terms` WRITE;
/*!40000 ALTER TABLE `payment_terms` DISABLE KEYS */;
/*!40000 ALTER TABLE `payment_terms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `price_list_items`
--

DROP TABLE IF EXISTS `price_list_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `price_list_items` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `price_list_id` int(10) unsigned NOT NULL,
  `product_id` bigint(20) unsigned NOT NULL,
  `unit_id` bigint(20) unsigned NOT NULL,
  `min_quantity` decimal(12,4) NOT NULL DEFAULT 1.0000,
  `unit_price` decimal(15,4) NOT NULL,
  `discount_percentage` decimal(5,2) NOT NULL DEFAULT 0.00,
  `discount_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `final_price` decimal(15,4) GENERATED ALWAYS AS (`unit_price` - `unit_price` * `discount_percentage` / 100 - `discount_amount`) STORED,
  `effective_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_price_list_product` (`price_list_id`,`product_id`,`unit_id`,`min_quantity`),
  KEY `price_list_items_unit_id_foreign` (`unit_id`),
  KEY `idx_price_list_items_price_list` (`price_list_id`),
  KEY `idx_price_list_items_product` (`product_id`),
  CONSTRAINT `price_list_items_price_list_id_foreign` FOREIGN KEY (`price_list_id`) REFERENCES `price_lists` (`id`) ON DELETE CASCADE,
  CONSTRAINT `price_list_items_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `price_list_items_unit_id_foreign` FOREIGN KEY (`unit_id`) REFERENCES `item_units` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `price_list_items`
--

LOCK TABLES `price_list_items` WRITE;
/*!40000 ALTER TABLE `price_list_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `price_list_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `price_lists`
--

DROP TABLE IF EXISTS `price_lists`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `price_lists` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `name_ar` varchar(100) NOT NULL,
  `name_en` varchar(100) DEFAULT NULL,
  `currency_id` bigint(20) unsigned NOT NULL,
  `valid_from` date NOT NULL,
  `valid_to` date DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `price_type` enum('retail','wholesale','special','promotional','contract') NOT NULL DEFAULT 'retail',
  `rounding_method` enum('none','normal','up','down') NOT NULL DEFAULT 'none',
  `rounding_factor` decimal(5,2) NOT NULL DEFAULT 0.05,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `price_lists_code_unique` (`code`),
  KEY `price_lists_currency_id_foreign` (`currency_id`),
  KEY `idx_price_lists_code` (`code`),
  KEY `idx_price_lists_validity` (`valid_from`,`valid_to`),
  KEY `idx_price_lists_active` (`is_active`),
  CONSTRAINT `price_lists_currency_id_foreign` FOREIGN KEY (`currency_id`) REFERENCES `currencies` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `price_lists`
--

LOCK TABLES `price_lists` WRITE;
/*!40000 ALTER TABLE `price_lists` DISABLE KEYS */;
/*!40000 ALTER TABLE `price_lists` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_collection_products`
--

DROP TABLE IF EXISTS `product_collection_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `product_collection_products` (
  `product_collection_id` bigint(20) unsigned NOT NULL,
  `product_id` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`product_collection_id`,`product_id`),
  KEY `product_collection_products_product_id_foreign` (`product_id`),
  CONSTRAINT `product_collection_products_product_collection_id_foreign` FOREIGN KEY (`product_collection_id`) REFERENCES `product_collections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `product_collection_products_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_collection_products`
--

LOCK TABLES `product_collection_products` WRITE;
/*!40000 ALTER TABLE `product_collection_products` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_collection_products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_collections`
--

DROP TABLE IF EXISTS `product_collections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `product_collections` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(191) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `description` varchar(400) DEFAULT NULL,
  `image` varchar(191) DEFAULT NULL,
  `status` varchar(60) NOT NULL DEFAULT 'published',
  `is_featured` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_collections`
--

LOCK TABLES `product_collections` WRITE;
/*!40000 ALTER TABLE `product_collections` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_collections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_collections_translations`
--

DROP TABLE IF EXISTS `product_collections_translations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `product_collections_translations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `lang_code` varchar(10) NOT NULL,
  `ec_product_collections_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_collection_translation` (`ec_product_collections_id`,`lang_code`),
  KEY `product_collections_translations_lang_code_index` (`lang_code`),
  CONSTRAINT `fk_pct_ec_id` FOREIGN KEY (`ec_product_collections_id`) REFERENCES `product_collections` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_collections_translations`
--

LOCK TABLES `product_collections_translations` WRITE;
/*!40000 ALTER TABLE `product_collections_translations` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_collections_translations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_supplier`
--

DROP TABLE IF EXISTS `product_supplier`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `product_supplier` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint(20) unsigned NOT NULL,
  `supplier_id` bigint(20) unsigned NOT NULL,
  `cost_price` decimal(10,2) DEFAULT NULL,
  `supplier_sku` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `product_supplier_product_id_foreign` (`product_id`),
  KEY `product_supplier_supplier_id_foreign` (`supplier_id`),
  CONSTRAINT `product_supplier_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `product_supplier_supplier_id_foreign` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_supplier`
--

LOCK TABLES `product_supplier` WRITE;
/*!40000 ALTER TABLE `product_supplier` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_supplier` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_variation_items`
--

DROP TABLE IF EXISTS `product_variation_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `product_variation_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `variation_id` bigint(20) unsigned NOT NULL,
  `attribute_id` bigint(20) unsigned NOT NULL,
  `attribute_value` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `product_variation_items_variation_id_index` (`variation_id`),
  KEY `product_variation_items_attribute_id_index` (`attribute_id`),
  CONSTRAINT `product_variation_items_attribute_id_foreign` FOREIGN KEY (`attribute_id`) REFERENCES `item_attributes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `product_variation_items_variation_id_foreign` FOREIGN KEY (`variation_id`) REFERENCES `product_variations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_variation_items`
--

LOCK TABLES `product_variation_items` WRITE;
/*!40000 ALTER TABLE `product_variation_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_variation_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_variations`
--

DROP TABLE IF EXISTS `product_variations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `product_variations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint(20) unsigned NOT NULL,
  `configurable_product_id` bigint(20) unsigned DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `product_variations_product_id_index` (`product_id`),
  KEY `product_variations_configurable_product_id_index` (`configurable_product_id`),
  CONSTRAINT `product_variations_configurable_product_id_foreign` FOREIGN KEY (`configurable_product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `product_variations_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_variations`
--

LOCK TABLES `product_variations` WRITE;
/*!40000 ALTER TABLE `product_variations` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_variations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `products` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `product_code` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `name_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`name_json`)),
  `slug` varchar(255) NOT NULL,
  `slug_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`slug_json`)),
  `description` text DEFAULT NULL,
  `description_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`description_json`)),
  `content` longtext DEFAULT NULL,
  `status` enum('active','inactive','draft','pending') NOT NULL DEFAULT 'draft',
  `images` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`images`)),
  `image` varchar(255) DEFAULT NULL,
  `video_media` varchar(255) DEFAULT NULL,
  `sku` varchar(255) DEFAULT NULL,
  `barcode` varchar(255) DEFAULT NULL,
  `parent_id` bigint(20) unsigned DEFAULT NULL,
  `brand_id` bigint(20) unsigned DEFAULT NULL,
  `supplier_code` varchar(50) DEFAULT NULL,
  `order` int(11) NOT NULL DEFAULT 0,
  `views` int(11) NOT NULL DEFAULT 0,
  `quantity` int(11) NOT NULL DEFAULT 0,
  `stock_status` varchar(255) NOT NULL DEFAULT 'in_stock',
  `allow_checkout_when_out_of_stock` tinyint(1) NOT NULL DEFAULT 0,
  `with_storehouse_management` tinyint(1) NOT NULL DEFAULT 0,
  `minimum_order_quantity` int(11) NOT NULL DEFAULT 1,
  `maximum_order_quantity` int(11) DEFAULT NULL,
  `cost_per_item` decimal(15,2) DEFAULT NULL,
  `price` decimal(15,2) DEFAULT NULL,
  `sale_price` decimal(15,2) DEFAULT NULL,
  `sale_type` varchar(255) DEFAULT NULL,
  `start_date` timestamp NULL DEFAULT NULL,
  `end_date` timestamp NULL DEFAULT NULL,
  `price_includes_tax` tinyint(1) NOT NULL DEFAULT 0,
  `tax_id` bigint(20) unsigned DEFAULT NULL,
  `product_type` enum('simple','variable') NOT NULL DEFAULT 'simple',
  `is_featured` tinyint(1) NOT NULL DEFAULT 0,
  `is_variation` tinyint(1) NOT NULL DEFAULT 0,
  `variations_count` int(11) NOT NULL DEFAULT 0,
  `length` decimal(8,2) DEFAULT NULL,
  `wide` decimal(8,2) DEFAULT NULL,
  `height` decimal(8,2) DEFAULT NULL,
  `weight` decimal(8,2) DEFAULT NULL,
  `reviews_count` int(11) NOT NULL DEFAULT 0,
  `reviews_avg` decimal(3,2) NOT NULL DEFAULT 0.00,
  `meta_title` varchar(255) DEFAULT NULL,
  `meta_title_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`meta_title_json`)),
  `meta_description` text DEFAULT NULL,
  `meta_description_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`meta_description_json`)),
  `generate_license_code` tinyint(1) NOT NULL DEFAULT 0,
  `license_code_type` varchar(255) DEFAULT NULL,
  `notify_attachment_updated` tinyint(1) NOT NULL DEFAULT 0,
  `specification_table_id` bigint(20) unsigned DEFAULT NULL,
  `approved_by` bigint(20) unsigned DEFAULT NULL,
  `created_by_id` bigint(20) unsigned DEFAULT NULL,
  `created_by_type` varchar(255) DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `products_product_code_unique` (`product_code`),
  UNIQUE KEY `products_slug_unique` (`slug`),
  UNIQUE KEY `products_sku_unique` (`sku`),
  UNIQUE KEY `products_barcode_unique` (`barcode`),
  KEY `products_parent_id_foreign` (`parent_id`),
  KEY `products_brand_id_foreign` (`brand_id`),
  CONSTRAINT `products_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE SET NULL,
  CONSTRAINT `products_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `products` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_costings`
--

DROP TABLE IF EXISTS `purchase_costings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_costings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint(20) unsigned NOT NULL,
  `warehouse_id` bigint(20) unsigned DEFAULT NULL,
  `purchase_date` date NOT NULL,
  `invoice_detail_id` bigint(20) unsigned DEFAULT NULL,
  `quantity` decimal(12,4) NOT NULL,
  `unit_id` bigint(20) unsigned NOT NULL,
  `purchase_price` decimal(15,4) NOT NULL,
  `landed_cost_per_unit` decimal(15,4) NOT NULL DEFAULT 0.0000,
  `additional_costs` decimal(15,4) NOT NULL DEFAULT 0.0000,
  `total_unit_cost` decimal(15,4) GENERATED ALWAYS AS (`purchase_price` + `landed_cost_per_unit` + `additional_costs`) STORED,
  `total_cost` decimal(15,2) GENERATED ALWAYS AS (`quantity` * (`purchase_price` + `landed_cost_per_unit` + `additional_costs`)) STORED,
  `average_cost` decimal(15,4) DEFAULT NULL,
  `costing_method` enum('fifo','lifo','weighted_average','specific_identification') NOT NULL DEFAULT 'weighted_average',
  `batch_number` varchar(100) DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `is_allocated` tinyint(1) NOT NULL DEFAULT 0,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `purchase_costings_warehouse_id_foreign` (`warehouse_id`),
  KEY `purchase_costings_invoice_detail_id_foreign` (`invoice_detail_id`),
  KEY `purchase_costings_unit_id_foreign` (`unit_id`),
  KEY `idx_purchase_costing_product` (`product_id`),
  KEY `idx_purchase_costing_date` (`purchase_date`),
  KEY `idx_purchase_costing_batch` (`batch_number`),
  CONSTRAINT `purchase_costings_invoice_detail_id_foreign` FOREIGN KEY (`invoice_detail_id`) REFERENCES `purchase_invoice_details` (`id`),
  CONSTRAINT `purchase_costings_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `purchase_costings_unit_id_foreign` FOREIGN KEY (`unit_id`) REFERENCES `item_units` (`id`),
  CONSTRAINT `purchase_costings_warehouse_id_foreign` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_costings`
--

LOCK TABLES `purchase_costings` WRITE;
/*!40000 ALTER TABLE `purchase_costings` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_costings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_discount_suppliers`
--

DROP TABLE IF EXISTS `purchase_discount_suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_discount_suppliers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `discount_id` bigint(20) unsigned NOT NULL,
  `supplier_id` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_discount_supplier` (`discount_id`,`supplier_id`),
  KEY `purchase_discount_suppliers_supplier_id_foreign` (`supplier_id`),
  CONSTRAINT `purchase_discount_suppliers_discount_id_foreign` FOREIGN KEY (`discount_id`) REFERENCES `purchase_discounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `purchase_discount_suppliers_supplier_id_foreign` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_discount_suppliers`
--

LOCK TABLES `purchase_discount_suppliers` WRITE;
/*!40000 ALTER TABLE `purchase_discount_suppliers` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_discount_suppliers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_discounts`
--

DROP TABLE IF EXISTS `purchase_discounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_discounts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `discount_code` varchar(50) NOT NULL,
  `name_ar` varchar(100) NOT NULL,
  `name_en` varchar(100) DEFAULT NULL,
  `discount_type` enum('percentage','fixed_amount','buy_x_get_y') NOT NULL,
  `value` decimal(10,2) NOT NULL,
  `min_purchase_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `max_discount_amount` decimal(15,2) DEFAULT NULL,
  `applicable_to` enum('all','specific_suppliers','specific_categories','specific_products') NOT NULL DEFAULT 'all',
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `max_uses` int(11) DEFAULT NULL,
  `current_uses` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_compound` tinyint(1) NOT NULL DEFAULT 0,
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchase_discounts_discount_code_unique` (`discount_code`),
  KEY `idx_purchase_discounts_code` (`discount_code`),
  KEY `idx_purchase_discounts_active` (`is_active`,`start_date`,`end_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_discounts`
--

LOCK TABLES `purchase_discounts` WRITE;
/*!40000 ALTER TABLE `purchase_discounts` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_discounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_expenses`
--

DROP TABLE IF EXISTS `purchase_expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_expenses` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `expense_number` varchar(50) NOT NULL,
  `expense_date` date NOT NULL,
  `supplier_id` bigint(20) unsigned DEFAULT NULL,
  `invoice_id` bigint(20) unsigned DEFAULT NULL,
  `expense_type` enum('shipping','freight','customs','insurance','handling','storage','installation','other') NOT NULL,
  `description_ar` varchar(255) DEFAULT NULL,
  `description_en` varchar(255) DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `currency_id` bigint(20) unsigned NOT NULL,
  `exchange_rate` decimal(15,6) NOT NULL DEFAULT 1.000000,
  `base_amount` decimal(15,2) GENERATED ALWAYS AS (`amount` * `exchange_rate`) STORED,
  `tax_id` bigint(20) unsigned DEFAULT NULL,
  `tax_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(15,2) GENERATED ALWAYS AS (`amount` + `tax_amount`) STORED,
  `allocation_status` enum('not_allocated','partially_allocated','fully_allocated') NOT NULL DEFAULT 'not_allocated',
  `allocated_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `is_posted` tinyint(1) NOT NULL DEFAULT 0,
  `posted_at` timestamp NULL DEFAULT NULL,
  `posted_by` bigint(20) unsigned DEFAULT NULL,
  `payment_status` enum('unpaid','partial','paid') NOT NULL DEFAULT 'unpaid',
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchase_expenses_expense_number_unique` (`expense_number`),
  KEY `purchase_expenses_supplier_id_foreign` (`supplier_id`),
  KEY `purchase_expenses_currency_id_foreign` (`currency_id`),
  KEY `purchase_expenses_tax_id_foreign` (`tax_id`),
  KEY `purchase_expenses_posted_by_foreign` (`posted_by`),
  KEY `purchase_expenses_created_by_foreign` (`created_by`),
  KEY `idx_purchase_expenses_number` (`expense_number`),
  KEY `idx_purchase_expenses_date` (`expense_date`),
  KEY `idx_purchase_expenses_invoice` (`invoice_id`),
  CONSTRAINT `purchase_expenses_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `purchase_expenses_currency_id_foreign` FOREIGN KEY (`currency_id`) REFERENCES `currencies` (`id`),
  CONSTRAINT `purchase_expenses_invoice_id_foreign` FOREIGN KEY (`invoice_id`) REFERENCES `purchase_invoices` (`id`),
  CONSTRAINT `purchase_expenses_posted_by_foreign` FOREIGN KEY (`posted_by`) REFERENCES `users` (`id`),
  CONSTRAINT `purchase_expenses_supplier_id_foreign` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  CONSTRAINT `purchase_expenses_tax_id_foreign` FOREIGN KEY (`tax_id`) REFERENCES `purchase_taxes` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_expenses`
--

LOCK TABLES `purchase_expenses` WRITE;
/*!40000 ALTER TABLE `purchase_expenses` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_expenses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_invoice_details`
--

DROP TABLE IF EXISTS `purchase_invoice_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_invoice_details` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `invoice_id` bigint(20) unsigned NOT NULL,
  `product_id` bigint(20) unsigned NOT NULL,
  `warehouse_id` bigint(20) unsigned NOT NULL,
  `quantity` decimal(12,4) NOT NULL DEFAULT 0.0000,
  `received_quantity` decimal(12,4) DEFAULT 0.0000,
  `pending_quantity` decimal(12,4) GENERATED ALWAYS AS (`quantity` - `received_quantity`) STORED,
  `unit_id` bigint(20) unsigned NOT NULL,
  `unit_price` decimal(15,4) NOT NULL DEFAULT 0.0000,
  `discount_percentage` decimal(5,2) DEFAULT 0.00,
  `discount_amount` decimal(15,2) DEFAULT 0.00,
  `tax_percentage` decimal(5,2) DEFAULT 0.00,
  `tax_amount` decimal(15,2) DEFAULT 0.00,
  `line_total` decimal(15,2) GENERATED ALWAYS AS (`quantity` * `unit_price` - `discount_amount` + `tax_amount`) STORED,
  `base_line_total` decimal(15,2) DEFAULT NULL,
  `batch_number` varchar(100) DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `production_date` date DEFAULT NULL,
  `shelf_location` varchar(50) DEFAULT NULL,
  `attribute_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attribute_data`)),
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `purchase_invoice_details_warehouse_id_foreign` (`warehouse_id`),
  KEY `purchase_invoice_details_unit_id_foreign` (`unit_id`),
  KEY `idx_invoice_details_invoice` (`invoice_id`),
  KEY `idx_invoice_details_product` (`product_id`),
  KEY `idx_invoice_details_batch` (`batch_number`),
  KEY `idx_invoice_details_expiry` (`expiry_date`),
  CONSTRAINT `purchase_invoice_details_invoice_id_foreign` FOREIGN KEY (`invoice_id`) REFERENCES `purchase_invoices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `purchase_invoice_details_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `purchase_invoice_details_unit_id_foreign` FOREIGN KEY (`unit_id`) REFERENCES `item_units` (`id`),
  CONSTRAINT `purchase_invoice_details_warehouse_id_foreign` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='تفاصيل بنود فواتير الشراء';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_invoice_details`
--

LOCK TABLES `purchase_invoice_details` WRITE;
/*!40000 ALTER TABLE `purchase_invoice_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_invoice_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_invoices`
--

DROP TABLE IF EXISTS `purchase_invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_invoices` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `invoice_number` varchar(50) NOT NULL,
  `supplier_id` bigint(20) unsigned NOT NULL,
  `order_id` bigint(20) unsigned DEFAULT NULL,
  `currency_id` bigint(20) unsigned NOT NULL,
  `exchange_rate` decimal(15,6) NOT NULL DEFAULT 1.000000,
  `invoice_date` date NOT NULL,
  `due_date` date DEFAULT NULL,
  `posting_date` date DEFAULT NULL,
  `warehouse_id` bigint(20) unsigned NOT NULL,
  `subtotal` decimal(15,2) NOT NULL DEFAULT 0.00,
  `discount_amount` decimal(15,2) DEFAULT 0.00,
  `tax_amount` decimal(15,2) DEFAULT 0.00,
  `shipping_cost` decimal(15,2) DEFAULT 0.00,
  `other_costs` decimal(15,2) DEFAULT 0.00,
  `total_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `base_total` decimal(15,2) GENERATED ALWAYS AS (`total_amount` * `exchange_rate`) STORED,
  `paid_amount` decimal(15,2) DEFAULT 0.00,
  `base_paid` decimal(15,2) GENERATED ALWAYS AS (`paid_amount` * `exchange_rate`) STORED,
  `balance_amount` decimal(15,2) GENERATED ALWAYS AS (`total_amount` - `paid_amount`) STORED,
  `payment_status` enum('unpaid','partial','paid','overdue') NOT NULL DEFAULT 'unpaid',
  `invoice_type` enum('standard','proforma','credit_note','debit_note') NOT NULL DEFAULT 'standard',
  `payment_terms` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `internal_notes` text DEFAULT NULL,
  `is_posted` tinyint(1) NOT NULL DEFAULT 0,
  `posted_at` timestamp NULL DEFAULT NULL,
  `posted_by` bigint(20) unsigned DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchase_invoices_invoice_number_unique` (`invoice_number`),
  KEY `purchase_invoices_currency_id_foreign` (`currency_id`),
  KEY `purchase_invoices_warehouse_id_foreign` (`warehouse_id`),
  KEY `idx_invoices_number` (`invoice_number`),
  KEY `idx_invoices_date` (`invoice_date`),
  KEY `idx_invoices_status` (`payment_status`),
  KEY `idx_invoices_supplier` (`supplier_id`),
  KEY `idx_invoices_due_date` (`due_date`),
  CONSTRAINT `purchase_invoices_currency_id_foreign` FOREIGN KEY (`currency_id`) REFERENCES `currencies` (`id`),
  CONSTRAINT `purchase_invoices_supplier_id_foreign` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  CONSTRAINT `purchase_invoices_warehouse_id_foreign` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='فواتير الشراء من الموردين';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_invoices`
--

LOCK TABLES `purchase_invoices` WRITE;
/*!40000 ALTER TABLE `purchase_invoices` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_order_items`
--

DROP TABLE IF EXISTS `purchase_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_order_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `purchase_order_id` bigint(20) unsigned NOT NULL,
  `quotation_item_id` bigint(20) unsigned DEFAULT NULL,
  `line_number` int(11) NOT NULL,
  `item_type` enum('product','service','expense','asset') NOT NULL DEFAULT 'product',
  `product_id` bigint(20) unsigned DEFAULT NULL,
  `service_id` bigint(20) unsigned DEFAULT NULL,
  `item_code` varchar(100) DEFAULT NULL,
  `item_name_ar` varchar(255) NOT NULL,
  `item_name_en` varchar(255) DEFAULT NULL,
  `description_ar` text DEFAULT NULL,
  `description_en` text DEFAULT NULL,
  `ordered_quantity` decimal(15,4) NOT NULL DEFAULT 0.0000,
  `received_quantity` decimal(15,4) NOT NULL DEFAULT 0.0000,
  `pending_quantity` decimal(15,4) GENERATED ALWAYS AS (`ordered_quantity` - `received_quantity`) STORED,
  `unit_id` bigint(20) unsigned DEFAULT NULL,
  `unit_price` decimal(15,4) NOT NULL DEFAULT 0.0000,
  `discount_percent` decimal(5,2) NOT NULL DEFAULT 0.00,
  `discount_amount` decimal(15,4) NOT NULL DEFAULT 0.0000,
  `net_price` decimal(15,4) GENERATED ALWAYS AS (`unit_price` - `discount_amount`) STORED,
  `line_total` decimal(15,2) GENERATED ALWAYS AS (`ordered_quantity` * (`unit_price` - `discount_amount`)) STORED,
  `tax_id` bigint(20) unsigned DEFAULT NULL,
  `tax_percent` decimal(5,2) NOT NULL DEFAULT 0.00,
  `tax_total` decimal(15,2) GENERATED ALWAYS AS (`ordered_quantity` * (`unit_price` - `discount_amount`) * `tax_percent` / 100) STORED,
  `required_date` date DEFAULT NULL,
  `promised_delivery_date` date DEFAULT NULL,
  `warehouse_id` bigint(20) unsigned DEFAULT NULL,
  `cost_center_id` bigint(20) unsigned DEFAULT NULL,
  `project_id` bigint(20) unsigned DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `purchase_order_items_unit_id_foreign` (`unit_id`),
  KEY `purchase_order_items_tax_id_foreign` (`tax_id`),
  KEY `purchase_order_items_purchase_order_id_index` (`purchase_order_id`),
  KEY `purchase_order_items_quotation_item_id_index` (`quotation_item_id`),
  KEY `purchase_order_items_product_id_index` (`product_id`),
  KEY `purchase_order_items_warehouse_id_index` (`warehouse_id`),
  CONSTRAINT `purchase_order_items_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
  CONSTRAINT `purchase_order_items_purchase_order_id_foreign` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `purchase_order_items_quotation_item_id_foreign` FOREIGN KEY (`quotation_item_id`) REFERENCES `purchase_quotation_items` (`id`) ON DELETE SET NULL,
  CONSTRAINT `purchase_order_items_tax_id_foreign` FOREIGN KEY (`tax_id`) REFERENCES `taxes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `purchase_order_items_unit_id_foreign` FOREIGN KEY (`unit_id`) REFERENCES `item_units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `purchase_order_items_warehouse_id_foreign` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_order_items`
--

LOCK TABLES `purchase_order_items` WRITE;
/*!40000 ALTER TABLE `purchase_order_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_orders`
--

DROP TABLE IF EXISTS `purchase_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_orders` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `po_number` varchar(255) NOT NULL,
  `po_date` date NOT NULL,
  `expected_delivery_date` date DEFAULT NULL,
  `quotation_id` bigint(20) unsigned DEFAULT NULL,
  `vendor_id` bigint(20) unsigned NOT NULL,
  `vendor_contact_person` varchar(255) DEFAULT NULL,
  `vendor_phone` varchar(255) DEFAULT NULL,
  `vendor_email` varchar(255) DEFAULT NULL,
  `status` enum('draft','pending_approval','approved','sent_to_vendor','partially_received','fully_received','invoiced','closed','cancelled') NOT NULL DEFAULT 'draft',
  `priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  `currency_id` bigint(20) unsigned NOT NULL,
  `exchange_rate` decimal(15,6) NOT NULL DEFAULT 1.000000,
  `subtotal` decimal(15,2) NOT NULL DEFAULT 0.00,
  `discount_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `shipping_charges` decimal(15,2) NOT NULL DEFAULT 0.00,
  `other_charges` decimal(15,2) NOT NULL DEFAULT 0.00,
  `grand_total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `payment_terms_id` bigint(20) unsigned DEFAULT NULL,
  `delivery_terms_id` bigint(20) unsigned DEFAULT NULL,
  `shipping_method` varchar(255) DEFAULT NULL,
  `shipping_address` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `internal_notes` text DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `approved_by` bigint(20) unsigned DEFAULT NULL,
  `approved_date` timestamp NULL DEFAULT NULL,
  `sent_date` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchase_orders_po_number_unique` (`po_number`),
  KEY `purchase_orders_currency_id_foreign` (`currency_id`),
  KEY `purchase_orders_created_by_foreign` (`created_by`),
  KEY `purchase_orders_updated_by_foreign` (`updated_by`),
  KEY `purchase_orders_approved_by_foreign` (`approved_by`),
  KEY `purchase_orders_po_date_index` (`po_date`),
  KEY `purchase_orders_vendor_id_index` (`vendor_id`),
  KEY `purchase_orders_quotation_id_index` (`quotation_id`),
  KEY `purchase_orders_status_index` (`status`),
  KEY `purchase_orders_payment_terms_id_index` (`payment_terms_id`),
  KEY `purchase_orders_delivery_terms_id_index` (`delivery_terms_id`),
  CONSTRAINT `purchase_orders_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `purchase_orders_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `purchase_orders_currency_id_foreign` FOREIGN KEY (`currency_id`) REFERENCES `currencies` (`id`),
  CONSTRAINT `purchase_orders_quotation_id_foreign` FOREIGN KEY (`quotation_id`) REFERENCES `purchase_quotations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `purchase_orders_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `purchase_orders_vendor_id_foreign` FOREIGN KEY (`vendor_id`) REFERENCES `suppliers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_orders`
--

LOCK TABLES `purchase_orders` WRITE;
/*!40000 ALTER TABLE `purchase_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_quotation_items`
--

DROP TABLE IF EXISTS `purchase_quotation_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_quotation_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `quotation_id` bigint(20) unsigned NOT NULL,
  `line_number` int(11) NOT NULL,
  `item_type` enum('product','service','material','asset','expense','other') NOT NULL DEFAULT 'product',
  `product_id` bigint(20) unsigned DEFAULT NULL,
  `service_id` bigint(20) unsigned DEFAULT NULL,
  `item_code` varchar(100) DEFAULT NULL,
  `item_name_ar` varchar(500) NOT NULL,
  `item_name_en` varchar(500) DEFAULT NULL,
  `description_ar` text DEFAULT NULL,
  `description_en` text DEFAULT NULL,
  `quantity` decimal(12,3) NOT NULL DEFAULT 1.000,
  `unit_id` bigint(20) unsigned NOT NULL,
  `received_quantity` decimal(12,3) NOT NULL DEFAULT 0.000,
  `pending_quantity` decimal(12,3) GENERATED ALWAYS AS (`quantity` - `received_quantity`) STORED,
  `unit_price` decimal(15,4) NOT NULL DEFAULT 0.0000,
  `discount_percent` decimal(5,2) NOT NULL DEFAULT 0.00,
  `discount_amount` decimal(15,4) NOT NULL DEFAULT 0.0000,
  `net_price` decimal(15,4) GENERATED ALWAYS AS (`unit_price` - `discount_amount`) STORED,
  `line_total` decimal(15,2) GENERATED ALWAYS AS (`quantity` * `net_price`) STORED,
  `tax_id` bigint(20) unsigned DEFAULT NULL,
  `tax_amount` decimal(15,4) NOT NULL DEFAULT 0.0000,
  `tax_total` decimal(15,2) GENERATED ALWAYS AS (`line_total` * `tax_amount` / 100) STORED,
  `required_date` date DEFAULT NULL,
  `promised_delivery_date` date DEFAULT NULL,
  `warehouse_id` bigint(20) unsigned DEFAULT NULL,
  `inventory_account_id` bigint(20) unsigned DEFAULT NULL,
  `cost_center_id` bigint(20) unsigned DEFAULT NULL,
  `project_id` bigint(20) unsigned DEFAULT NULL,
  `budget_item_id` bigint(20) unsigned DEFAULT NULL,
  `attributes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attributes`)),
  `quality_requirements` text DEFAULT NULL,
  `inspection_required` tinyint(1) NOT NULL DEFAULT 0,
  `is_approved` tinyint(1) NOT NULL DEFAULT 0,
  `approval_notes` text DEFAULT NULL,
  `approved_by` bigint(20) unsigned DEFAULT NULL,
  `approved_date` date DEFAULT NULL,
  `technical_specifications` text DEFAULT NULL,
  `technical_approved` tinyint(1) NOT NULL DEFAULT 0,
  `technical_approver` bigint(20) unsigned DEFAULT NULL,
  `technical_approval_date` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `internal_comments` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `purchase_quotation_items_quotation_id_foreign` (`quotation_id`),
  CONSTRAINT `purchase_quotation_items_quotation_id_foreign` FOREIGN KEY (`quotation_id`) REFERENCES `purchase_quotations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_quotation_items`
--

LOCK TABLES `purchase_quotation_items` WRITE;
/*!40000 ALTER TABLE `purchase_quotation_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_quotation_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_quotations`
--

DROP TABLE IF EXISTS `purchase_quotations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_quotations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `quotation_number` varchar(50) NOT NULL,
  `quotation_date` date NOT NULL,
  `expiry_date` date NOT NULL,
  `company_id` bigint(20) unsigned NOT NULL,
  `department_id` bigint(20) unsigned NOT NULL,
  `prepared_by` bigint(20) unsigned NOT NULL,
  `vendor_id` bigint(20) unsigned NOT NULL,
  `vendor_contact_person` varchar(150) DEFAULT NULL,
  `vendor_phone` varchar(30) DEFAULT NULL,
  `vendor_email` varchar(150) DEFAULT NULL,
  `status` enum('draft','pending_approval','approved','sent_to_vendor','vendor_replied','converted_to_po','rejected','cancelled','expired') NOT NULL DEFAULT 'draft',
  `priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  `subtotal` decimal(15,2) NOT NULL DEFAULT 0.00,
  `discount_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `discount_percent` decimal(5,2) NOT NULL DEFAULT 0.00,
  `tax_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `shipping_charges` decimal(15,2) NOT NULL DEFAULT 0.00,
  `other_charges` decimal(15,2) NOT NULL DEFAULT 0.00,
  `grand_total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `currency_id` bigint(20) unsigned NOT NULL,
  `exchange_rate` decimal(10,6) NOT NULL DEFAULT 1.000000,
  `payment_terms_id` int(10) unsigned DEFAULT NULL,
  `delivery_terms_id` int(10) unsigned DEFAULT NULL,
  `shipping_method` varchar(100) DEFAULT NULL,
  `shipping_address` text DEFAULT NULL,
  `attachments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attachments`)),
  `notes` text DEFAULT NULL,
  `terms_and_conditions` text DEFAULT NULL,
  `internal_notes` text DEFAULT NULL,
  `converted_to_po_id` bigint(20) unsigned DEFAULT NULL,
  `quotation_template_id` int(10) unsigned DEFAULT NULL,
  `created_by` bigint(20) unsigned NOT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `approved_by` bigint(20) unsigned DEFAULT NULL,
  `approved_date` date DEFAULT NULL,
  `sent_date` date DEFAULT NULL,
  `converted_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchase_quotations_quotation_number_unique` (`quotation_number`),
  KEY `purchase_quotations_vendor_id_foreign` (`vendor_id`),
  KEY `purchase_quotations_currency_id_foreign` (`currency_id`),
  CONSTRAINT `purchase_quotations_currency_id_foreign` FOREIGN KEY (`currency_id`) REFERENCES `currencies` (`id`),
  CONSTRAINT `purchase_quotations_vendor_id_foreign` FOREIGN KEY (`vendor_id`) REFERENCES `suppliers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='عروض أسعار الشراء';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_quotations`
--

LOCK TABLES `purchase_quotations` WRITE;
/*!40000 ALTER TABLE `purchase_quotations` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_quotations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_return_details`
--

DROP TABLE IF EXISTS `purchase_return_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_return_details` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `return_id` bigint(20) unsigned NOT NULL,
  `invoice_detail_id` bigint(20) unsigned NOT NULL,
  `product_id` bigint(20) unsigned NOT NULL,
  `quantity` decimal(12,4) NOT NULL,
  `unit_id` bigint(20) unsigned NOT NULL,
  `unit_price` decimal(15,4) NOT NULL,
  `tax_percentage` decimal(5,2) NOT NULL DEFAULT 0.00,
  `tax_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `line_total` decimal(15,2) GENERATED ALWAYS AS (`quantity` * `unit_price` + `tax_amount`) STORED,
  `batch_number` varchar(100) DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `return_reason_details` text DEFAULT NULL,
  `condition` enum('new','used','damaged','defective') DEFAULT NULL,
  `inspection_notes` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `purchase_return_details_invoice_detail_id_foreign` (`invoice_detail_id`),
  KEY `purchase_return_details_unit_id_foreign` (`unit_id`),
  KEY `idx_return_details_return` (`return_id`),
  KEY `idx_return_details_product` (`product_id`),
  CONSTRAINT `purchase_return_details_invoice_detail_id_foreign` FOREIGN KEY (`invoice_detail_id`) REFERENCES `purchase_invoice_details` (`id`),
  CONSTRAINT `purchase_return_details_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `purchase_return_details_return_id_foreign` FOREIGN KEY (`return_id`) REFERENCES `purchase_returns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `purchase_return_details_unit_id_foreign` FOREIGN KEY (`unit_id`) REFERENCES `item_units` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_return_details`
--

LOCK TABLES `purchase_return_details` WRITE;
/*!40000 ALTER TABLE `purchase_return_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_return_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_returns`
--

DROP TABLE IF EXISTS `purchase_returns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_returns` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `return_number` varchar(50) NOT NULL,
  `invoice_id` bigint(20) unsigned NOT NULL,
  `supplier_id` bigint(20) unsigned NOT NULL,
  `warehouse_id` bigint(20) unsigned NOT NULL,
  `return_date` date NOT NULL,
  `return_reason` enum('damaged','defective','wrong_item','excess_quantity','quality_issue','expired','other') NOT NULL,
  `return_type` enum('full_return','partial_return','exchange') NOT NULL DEFAULT 'partial_return',
  `subtotal` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `restocking_fee` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `refund_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `refund_status` enum('pending','partial','completed','cancelled') NOT NULL DEFAULT 'pending',
  `status` enum('draft','requested','approved','completed','cancelled') NOT NULL DEFAULT 'draft',
  `approval_notes` text DEFAULT NULL,
  `received_by` bigint(20) unsigned DEFAULT NULL,
  `received_date` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchase_returns_return_number_unique` (`return_number`),
  KEY `purchase_returns_supplier_id_foreign` (`supplier_id`),
  KEY `purchase_returns_warehouse_id_foreign` (`warehouse_id`),
  KEY `purchase_returns_received_by_foreign` (`received_by`),
  KEY `purchase_returns_created_by_foreign` (`created_by`),
  KEY `idx_purchase_returns_number` (`return_number`),
  KEY `idx_purchase_returns_date` (`return_date`),
  KEY `idx_purchase_returns_invoice` (`invoice_id`),
  KEY `idx_purchase_returns_status` (`status`),
  CONSTRAINT `purchase_returns_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `purchase_returns_invoice_id_foreign` FOREIGN KEY (`invoice_id`) REFERENCES `purchase_invoices` (`id`),
  CONSTRAINT `purchase_returns_received_by_foreign` FOREIGN KEY (`received_by`) REFERENCES `users` (`id`),
  CONSTRAINT `purchase_returns_supplier_id_foreign` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  CONSTRAINT `purchase_returns_warehouse_id_foreign` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_returns`
--

LOCK TABLES `purchase_returns` WRITE;
/*!40000 ALTER TABLE `purchase_returns` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_returns` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_taxes`
--

DROP TABLE IF EXISTS `purchase_taxes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_taxes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tax_code` varchar(20) NOT NULL,
  `name_ar` varchar(100) NOT NULL,
  `name_en` varchar(100) DEFAULT NULL,
  `tax_rate` decimal(5,2) NOT NULL,
  `tax_type` enum('vat','sales_tax','withholding','excise','customs','other') NOT NULL DEFAULT 'vat',
  `calculation_method` enum('on_total','on_subtotal','exclusive','inclusive') NOT NULL DEFAULT 'on_subtotal',
  `is_recoverable` tinyint(1) NOT NULL DEFAULT 1,
  `recoverable_percentage` decimal(5,2) NOT NULL DEFAULT 100.00,
  `account_id` int(10) unsigned DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchase_taxes_tax_code_unique` (`tax_code`),
  KEY `purchase_taxes_account_id_foreign` (`account_id`),
  KEY `idx_purchase_taxes_code` (`tax_code`),
  KEY `idx_purchase_taxes_active` (`is_active`),
  CONSTRAINT `purchase_taxes_account_id_foreign` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`AccID`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_taxes`
--

LOCK TABLES `purchase_taxes` WRITE;
/*!40000 ALTER TABLE `purchase_taxes` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_taxes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `roles` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(120) NOT NULL,
  `name` varchar(120) NOT NULL,
  `permissions` text DEFAULT NULL,
  `description` varchar(400) DEFAULT NULL,
  `is_default` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `created_by` bigint(20) unsigned NOT NULL,
  `updated_by` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_slug_unique` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_agents`
--

DROP TABLE IF EXISTS `sales_agents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sales_agents` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `agent_code` varchar(20) NOT NULL,
  `name_ar` varchar(100) NOT NULL,
  `name_en` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `mobile` varchar(20) DEFAULT NULL,
  `commission_rate` decimal(5,2) NOT NULL DEFAULT 0.00,
  `target_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `supervisor_id` int(10) unsigned DEFAULT NULL,
  `hire_date` date DEFAULT NULL,
  `termination_date` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `notes` text DEFAULT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sales_agents_agent_code_unique` (`agent_code`),
  KEY `sales_agents_supervisor_id_foreign` (`supervisor_id`),
  KEY `idx_sales_agents_code` (`agent_code`),
  KEY `idx_sales_agents_name` (`name_ar`),
  KEY `idx_sales_agents_active` (`is_active`),
  CONSTRAINT `sales_agents_supervisor_id_foreign` FOREIGN KEY (`supervisor_id`) REFERENCES `sales_agents` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_agents`
--

LOCK TABLES `sales_agents` WRITE;
/*!40000 ALTER TABLE `sales_agents` DISABLE KEYS */;
/*!40000 ALTER TABLE `sales_agents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_commissions`
--

DROP TABLE IF EXISTS `sales_commissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sales_commissions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `commission_number` varchar(50) NOT NULL,
  `sales_agent_id` int(10) unsigned NOT NULL,
  `invoice_id` bigint(20) unsigned NOT NULL,
  `commission_date` date NOT NULL,
  `sales_amount` decimal(15,2) NOT NULL,
  `commission_rate` decimal(5,2) NOT NULL,
  `commission_amount` decimal(15,2) GENERATED ALWAYS AS (`sales_amount` * `commission_rate` / 100) STORED,
  `commission_type` enum('percentage','fixed','tiered') NOT NULL DEFAULT 'percentage',
  `tier_level` int(11) NOT NULL DEFAULT 1,
  `is_paid` tinyint(1) NOT NULL DEFAULT 0,
  `paid_date` date DEFAULT NULL,
  `payment_reference` varchar(100) DEFAULT NULL,
  `status` enum('pending','calculated','approved','paid','cancelled') NOT NULL DEFAULT 'pending',
  `notes` text DEFAULT NULL,
  `calculated_by` int(11) DEFAULT NULL,
  `calculated_at` timestamp NULL DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sales_commissions_commission_number_unique` (`commission_number`),
  KEY `sales_commissions_sales_agent_id_foreign` (`sales_agent_id`),
  KEY `sales_commissions_invoice_id_foreign` (`invoice_id`),
  CONSTRAINT `sales_commissions_invoice_id_foreign` FOREIGN KEY (`invoice_id`) REFERENCES `sales_invoices` (`id`),
  CONSTRAINT `sales_commissions_sales_agent_id_foreign` FOREIGN KEY (`sales_agent_id`) REFERENCES `sales_agents` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_commissions`
--

LOCK TABLES `sales_commissions` WRITE;
/*!40000 ALTER TABLE `sales_commissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `sales_commissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_discount_customers`
--

DROP TABLE IF EXISTS `sales_discount_customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sales_discount_customers` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `discount_id` int(10) unsigned NOT NULL,
  `customer_id` int(10) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sales_discount_customers_discount_id_customer_id_unique` (`discount_id`,`customer_id`),
  KEY `sales_discount_customers_customer_id_foreign` (`customer_id`),
  CONSTRAINT `sales_discount_customers_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sales_discount_customers_discount_id_foreign` FOREIGN KEY (`discount_id`) REFERENCES `sales_discounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_discount_customers`
--

LOCK TABLES `sales_discount_customers` WRITE;
/*!40000 ALTER TABLE `sales_discount_customers` DISABLE KEYS */;
/*!40000 ALTER TABLE `sales_discount_customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_discounts`
--

DROP TABLE IF EXISTS `sales_discounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sales_discounts` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `discount_code` varchar(50) NOT NULL,
  `name_ar` varchar(100) NOT NULL,
  `name_en` varchar(100) DEFAULT NULL,
  `discount_type` enum('percentage','fixed_amount','buy_x_get_y','seasonal') NOT NULL,
  `value` decimal(10,2) NOT NULL,
  `min_purchase_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `max_discount_amount` decimal(15,2) DEFAULT NULL,
  `applicable_to` enum('all','specific_customers','specific_groups','specific_products') NOT NULL DEFAULT 'all',
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `max_uses` int(11) DEFAULT NULL,
  `current_uses` int(11) NOT NULL DEFAULT 0,
  `max_uses_per_customer` int(11) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_compound` tinyint(1) NOT NULL DEFAULT 0,
  `notes` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sales_discounts_discount_code_unique` (`discount_code`),
  KEY `sales_discounts_is_active_start_date_end_date_index` (`is_active`,`start_date`,`end_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_discounts`
--

LOCK TABLES `sales_discounts` WRITE;
/*!40000 ALTER TABLE `sales_discounts` DISABLE KEYS */;
/*!40000 ALTER TABLE `sales_discounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_invoice_details`
--

DROP TABLE IF EXISTS `sales_invoice_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sales_invoice_details` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `invoice_id` bigint(20) unsigned NOT NULL,
  `order_detail_id` bigint(20) unsigned DEFAULT NULL,
  `product_id` bigint(20) unsigned NOT NULL,
  `warehouse_id` bigint(20) unsigned NOT NULL,
  `quantity` decimal(12,4) NOT NULL DEFAULT 0.0000,
  `delivered_quantity` decimal(12,4) NOT NULL DEFAULT 0.0000,
  `unit_id` bigint(20) unsigned NOT NULL,
  `unit_price` decimal(15,4) NOT NULL,
  `discount_percentage` decimal(5,2) NOT NULL DEFAULT 0.00,
  `discount_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax_id` bigint(20) unsigned DEFAULT NULL,
  `tax_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `line_total` decimal(15,2) GENERATED ALWAYS AS (`quantity` * `unit_price` - `discount_amount` + `tax_amount`) STORED,
  `base_line_total` decimal(15,2) DEFAULT NULL,
  `batch_number` varchar(100) DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `shelf_location` varchar(50) DEFAULT NULL,
  `attribute_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attribute_data`)),
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `sales_invoice_details_order_detail_id_foreign` (`order_detail_id`),
  KEY `sales_invoice_details_warehouse_id_foreign` (`warehouse_id`),
  KEY `sales_invoice_details_unit_id_foreign` (`unit_id`),
  KEY `idx_invoice_details_invoice` (`invoice_id`),
  KEY `idx_invoice_details_product` (`product_id`),
  KEY `idx_invoice_details_batch` (`batch_number`),
  CONSTRAINT `sales_invoice_details_invoice_id_foreign` FOREIGN KEY (`invoice_id`) REFERENCES `sales_invoices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sales_invoice_details_order_detail_id_foreign` FOREIGN KEY (`order_detail_id`) REFERENCES `sales_order_details` (`id`),
  CONSTRAINT `sales_invoice_details_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `sales_invoice_details_unit_id_foreign` FOREIGN KEY (`unit_id`) REFERENCES `item_units` (`id`),
  CONSTRAINT `sales_invoice_details_warehouse_id_foreign` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_invoice_details`
--

LOCK TABLES `sales_invoice_details` WRITE;
/*!40000 ALTER TABLE `sales_invoice_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `sales_invoice_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_invoices`
--

DROP TABLE IF EXISTS `sales_invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sales_invoices` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `invoice_number` varchar(50) NOT NULL,
  `customer_id` int(10) unsigned NOT NULL,
  `order_id` bigint(20) unsigned DEFAULT NULL,
  `quotation_id` bigint(20) unsigned DEFAULT NULL,
  `currency_id` bigint(20) unsigned NOT NULL,
  `exchange_rate` decimal(15,6) NOT NULL DEFAULT 1.000000,
  `invoice_date` date NOT NULL,
  `due_date` date DEFAULT NULL,
  `posting_date` date DEFAULT NULL,
  `price_list_id` int(10) unsigned DEFAULT NULL,
  `warehouse_id` bigint(20) unsigned NOT NULL,
  `subtotal` decimal(15,2) NOT NULL DEFAULT 0.00,
  `discount_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `shipping_cost` decimal(15,2) NOT NULL DEFAULT 0.00,
  `other_charges` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `base_total` decimal(15,2) GENERATED ALWAYS AS (`total_amount` * `exchange_rate`) STORED,
  `paid_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `base_paid` decimal(15,2) GENERATED ALWAYS AS (`paid_amount` * `exchange_rate`) STORED,
  `balance_amount` decimal(15,2) GENERATED ALWAYS AS (`total_amount` - `paid_amount`) STORED,
  `payment_status` enum('unpaid','partial','paid','overdue') NOT NULL DEFAULT 'unpaid',
  `invoice_type` enum('standard','proforma','credit_note','debit_note') NOT NULL DEFAULT 'standard',
  `sales_agent_id` int(10) unsigned DEFAULT NULL,
  `shipping_address_id` int(10) unsigned DEFAULT NULL,
  `payment_terms` varchar(255) DEFAULT NULL,
  `delivery_terms` varchar(255) DEFAULT NULL,
  `customer_notes` text DEFAULT NULL,
  `internal_notes` text DEFAULT NULL,
  `is_posted` tinyint(1) NOT NULL DEFAULT 0,
  `posted_at` timestamp NULL DEFAULT NULL,
  `posted_by` bigint(20) unsigned DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sales_invoices_invoice_number_unique` (`invoice_number`),
  KEY `sales_invoices_order_id_foreign` (`order_id`),
  KEY `sales_invoices_quotation_id_foreign` (`quotation_id`),
  KEY `sales_invoices_currency_id_foreign` (`currency_id`),
  KEY `sales_invoices_price_list_id_foreign` (`price_list_id`),
  KEY `sales_invoices_warehouse_id_foreign` (`warehouse_id`),
  KEY `sales_invoices_sales_agent_id_foreign` (`sales_agent_id`),
  KEY `sales_invoices_shipping_address_id_foreign` (`shipping_address_id`),
  KEY `idx_sales_invoices_number` (`invoice_number`),
  KEY `idx_sales_invoices_date` (`invoice_date`),
  KEY `idx_sales_invoices_status` (`payment_status`),
  KEY `idx_sales_invoices_customer` (`customer_id`),
  KEY `idx_sales_invoices_due_date` (`due_date`),
  CONSTRAINT `sales_invoices_currency_id_foreign` FOREIGN KEY (`currency_id`) REFERENCES `currencies` (`id`),
  CONSTRAINT `sales_invoices_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `sales_invoices_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `sales_orders` (`id`),
  CONSTRAINT `sales_invoices_price_list_id_foreign` FOREIGN KEY (`price_list_id`) REFERENCES `price_lists` (`id`),
  CONSTRAINT `sales_invoices_quotation_id_foreign` FOREIGN KEY (`quotation_id`) REFERENCES `sales_quotations` (`id`),
  CONSTRAINT `sales_invoices_sales_agent_id_foreign` FOREIGN KEY (`sales_agent_id`) REFERENCES `sales_agents` (`id`),
  CONSTRAINT `sales_invoices_shipping_address_id_foreign` FOREIGN KEY (`shipping_address_id`) REFERENCES `customer_addresses` (`id`),
  CONSTRAINT `sales_invoices_warehouse_id_foreign` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_invoices`
--

LOCK TABLES `sales_invoices` WRITE;
/*!40000 ALTER TABLE `sales_invoices` DISABLE KEYS */;
/*!40000 ALTER TABLE `sales_invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_order_details`
--

DROP TABLE IF EXISTS `sales_order_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sales_order_details` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint(20) unsigned NOT NULL,
  `product_id` bigint(20) unsigned NOT NULL,
  `quantity` decimal(12,4) NOT NULL DEFAULT 0.0000,
  `delivered_quantity` decimal(12,4) NOT NULL DEFAULT 0.0000,
  `pending_quantity` decimal(12,4) GENERATED ALWAYS AS (`quantity` - `delivered_quantity`) STORED,
  `unit_id` bigint(20) unsigned NOT NULL,
  `unit_price` decimal(15,4) NOT NULL,
  `discount_percentage` decimal(5,2) NOT NULL DEFAULT 0.00,
  `discount_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax_id` bigint(20) unsigned DEFAULT NULL,
  `tax_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `line_total` decimal(15,2) GENERATED ALWAYS AS (`quantity` * `unit_price` - `discount_amount` + `tax_amount`) STORED,
  `requested_delivery_date` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `sales_order_details_unit_id_foreign` (`unit_id`),
  KEY `idx_order_details_order` (`order_id`),
  KEY `idx_order_details_product` (`product_id`),
  CONSTRAINT `sales_order_details_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `sales_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sales_order_details_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `sales_order_details_unit_id_foreign` FOREIGN KEY (`unit_id`) REFERENCES `item_units` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_order_details`
--

LOCK TABLES `sales_order_details` WRITE;
/*!40000 ALTER TABLE `sales_order_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `sales_order_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_orders`
--

DROP TABLE IF EXISTS `sales_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sales_orders` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_number` varchar(50) NOT NULL,
  `customer_id` int(10) unsigned NOT NULL,
  `quotation_id` bigint(20) unsigned DEFAULT NULL,
  `currency_id` bigint(20) unsigned NOT NULL,
  `exchange_rate` decimal(15,6) NOT NULL DEFAULT 1.000000,
  `order_date` date NOT NULL,
  `delivery_date` date DEFAULT NULL,
  `actual_delivery_date` date DEFAULT NULL,
  `price_list_id` int(10) unsigned DEFAULT NULL,
  `warehouse_id` bigint(20) unsigned NOT NULL,
  `subtotal` decimal(15,2) NOT NULL DEFAULT 0.00,
  `discount_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `shipping_cost` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `base_total` decimal(15,2) GENERATED ALWAYS AS (`total_amount` * `exchange_rate`) STORED,
  `advance_payment` decimal(15,2) NOT NULL DEFAULT 0.00,
  `status` enum('draft','pending','confirmed','processing','ready_for_delivery','partially_delivered','completed','cancelled') NOT NULL DEFAULT 'draft',
  `sales_agent_id` int(10) unsigned DEFAULT NULL,
  `priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
  `shipping_method` varchar(100) DEFAULT NULL,
  `shipping_address_id` int(10) unsigned DEFAULT NULL,
  `payment_terms` varchar(255) DEFAULT NULL,
  `customer_notes` text DEFAULT NULL,
  `internal_notes` text DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `confirmed_by` bigint(20) unsigned DEFAULT NULL,
  `confirmed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sales_orders_order_number_unique` (`order_number`),
  KEY `sales_orders_quotation_id_foreign` (`quotation_id`),
  KEY `sales_orders_currency_id_foreign` (`currency_id`),
  KEY `sales_orders_price_list_id_foreign` (`price_list_id`),
  KEY `sales_orders_warehouse_id_foreign` (`warehouse_id`),
  KEY `sales_orders_sales_agent_id_foreign` (`sales_agent_id`),
  KEY `sales_orders_shipping_address_id_foreign` (`shipping_address_id`),
  KEY `idx_sales_orders_number` (`order_number`),
  KEY `idx_sales_orders_date` (`order_date`),
  KEY `idx_sales_orders_status` (`status`),
  KEY `idx_sales_orders_customer` (`customer_id`),
  KEY `idx_sales_orders_delivery` (`delivery_date`),
  CONSTRAINT `sales_orders_currency_id_foreign` FOREIGN KEY (`currency_id`) REFERENCES `currencies` (`id`),
  CONSTRAINT `sales_orders_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `sales_orders_price_list_id_foreign` FOREIGN KEY (`price_list_id`) REFERENCES `price_lists` (`id`),
  CONSTRAINT `sales_orders_quotation_id_foreign` FOREIGN KEY (`quotation_id`) REFERENCES `sales_quotations` (`id`),
  CONSTRAINT `sales_orders_sales_agent_id_foreign` FOREIGN KEY (`sales_agent_id`) REFERENCES `sales_agents` (`id`),
  CONSTRAINT `sales_orders_shipping_address_id_foreign` FOREIGN KEY (`shipping_address_id`) REFERENCES `customer_addresses` (`id`),
  CONSTRAINT `sales_orders_warehouse_id_foreign` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_orders`
--

LOCK TABLES `sales_orders` WRITE;
/*!40000 ALTER TABLE `sales_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `sales_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_quotation_details`
--

DROP TABLE IF EXISTS `sales_quotation_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sales_quotation_details` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `quotation_id` bigint(20) unsigned NOT NULL,
  `product_id` bigint(20) unsigned NOT NULL,
  `quantity` decimal(12,4) NOT NULL DEFAULT 0.0000,
  `unit_id` bigint(20) unsigned NOT NULL,
  `unit_price` decimal(15,4) NOT NULL,
  `discount_percentage` decimal(5,2) NOT NULL DEFAULT 0.00,
  `discount_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax_id` bigint(20) unsigned DEFAULT NULL,
  `tax_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `line_total` decimal(15,2) GENERATED ALWAYS AS (`quantity` * `unit_price` - `discount_amount` + `tax_amount`) STORED,
  `delivery_date` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `sales_quotation_details_unit_id_foreign` (`unit_id`),
  KEY `idx_quotation_details_quotation` (`quotation_id`),
  KEY `idx_quotation_details_product` (`product_id`),
  CONSTRAINT `sales_quotation_details_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `sales_quotation_details_quotation_id_foreign` FOREIGN KEY (`quotation_id`) REFERENCES `sales_quotations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sales_quotation_details_unit_id_foreign` FOREIGN KEY (`unit_id`) REFERENCES `item_units` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_quotation_details`
--

LOCK TABLES `sales_quotation_details` WRITE;
/*!40000 ALTER TABLE `sales_quotation_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `sales_quotation_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_quotations`
--

DROP TABLE IF EXISTS `sales_quotations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sales_quotations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `quotation_number` varchar(50) NOT NULL,
  `customer_id` int(10) unsigned NOT NULL,
  `currency_id` bigint(20) unsigned NOT NULL,
  `exchange_rate` decimal(15,6) NOT NULL DEFAULT 1.000000,
  `quotation_date` date NOT NULL,
  `expiry_date` date DEFAULT NULL,
  `valid_days` int(11) DEFAULT NULL,
  `price_list_id` int(10) unsigned DEFAULT NULL,
  `warehouse_id` bigint(20) unsigned DEFAULT NULL,
  `subtotal` decimal(15,2) NOT NULL DEFAULT 0.00,
  `discount_percentage` decimal(5,2) NOT NULL DEFAULT 0.00,
  `discount_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `shipping_cost` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `base_total` decimal(15,2) GENERATED ALWAYS AS (`total_amount` * `exchange_rate`) STORED,
  `status` enum('draft','sent','under_review','accepted','rejected','expired','converted') NOT NULL DEFAULT 'draft',
  `sales_agent_id` int(10) unsigned DEFAULT NULL,
  `probability_percentage` decimal(5,2) NOT NULL DEFAULT 0.00 COMMENT 'احتمال التحويل',
  `followup_date` date DEFAULT NULL,
  `sent_date` date DEFAULT NULL,
  `sent_method` enum('email','whatsapp','hand','other') DEFAULT NULL,
  `customer_notes` text DEFAULT NULL,
  `internal_notes` text DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sales_quotations_quotation_number_unique` (`quotation_number`),
  KEY `sales_quotations_currency_id_foreign` (`currency_id`),
  KEY `sales_quotations_price_list_id_foreign` (`price_list_id`),
  KEY `sales_quotations_warehouse_id_foreign` (`warehouse_id`),
  KEY `idx_sales_quotations_number` (`quotation_number`),
  KEY `idx_sales_quotations_date` (`quotation_date`),
  KEY `idx_sales_quotations_status` (`status`),
  KEY `idx_sales_quotations_customer` (`customer_id`),
  KEY `idx_sales_quotations_agent` (`sales_agent_id`),
  CONSTRAINT `sales_quotations_currency_id_foreign` FOREIGN KEY (`currency_id`) REFERENCES `currencies` (`id`),
  CONSTRAINT `sales_quotations_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `sales_quotations_price_list_id_foreign` FOREIGN KEY (`price_list_id`) REFERENCES `price_lists` (`id`),
  CONSTRAINT `sales_quotations_sales_agent_id_foreign` FOREIGN KEY (`sales_agent_id`) REFERENCES `sales_agents` (`id`),
  CONSTRAINT `sales_quotations_warehouse_id_foreign` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='عروض أسعار المبيعات للعملاء';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_quotations`
--

LOCK TABLES `sales_quotations` WRITE;
/*!40000 ALTER TABLE `sales_quotations` DISABLE KEYS */;
/*!40000 ALTER TABLE `sales_quotations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_return_details`
--

DROP TABLE IF EXISTS `sales_return_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sales_return_details` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `return_id` bigint(20) unsigned NOT NULL,
  `invoice_detail_id` bigint(20) unsigned NOT NULL,
  `product_id` bigint(20) unsigned NOT NULL,
  `quantity` decimal(12,4) NOT NULL,
  `unit_id` bigint(20) unsigned NOT NULL,
  `unit_price` decimal(15,4) NOT NULL,
  `tax_percentage` decimal(5,2) NOT NULL DEFAULT 0.00,
  `tax_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `line_total` decimal(15,2) GENERATED ALWAYS AS (`quantity` * `unit_price` + `tax_amount`) STORED,
  `batch_number` varchar(100) DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `return_reason_details` text DEFAULT NULL,
  `condition` enum('new','used','damaged','defective','opened') DEFAULT NULL,
  `inspection_notes` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `sales_return_details_return_id_foreign` (`return_id`),
  KEY `sales_return_details_invoice_detail_id_foreign` (`invoice_detail_id`),
  KEY `sales_return_details_product_id_foreign` (`product_id`),
  KEY `sales_return_details_unit_id_foreign` (`unit_id`),
  CONSTRAINT `sales_return_details_invoice_detail_id_foreign` FOREIGN KEY (`invoice_detail_id`) REFERENCES `sales_invoice_details` (`id`),
  CONSTRAINT `sales_return_details_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `sales_return_details_return_id_foreign` FOREIGN KEY (`return_id`) REFERENCES `sales_returns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sales_return_details_unit_id_foreign` FOREIGN KEY (`unit_id`) REFERENCES `item_units` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_return_details`
--

LOCK TABLES `sales_return_details` WRITE;
/*!40000 ALTER TABLE `sales_return_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `sales_return_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_returns`
--

DROP TABLE IF EXISTS `sales_returns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sales_returns` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `return_number` varchar(50) NOT NULL,
  `invoice_id` bigint(20) unsigned NOT NULL,
  `customer_id` int(10) unsigned NOT NULL,
  `warehouse_id` bigint(20) unsigned NOT NULL,
  `return_date` date NOT NULL,
  `return_reason` enum('damaged','defective','wrong_item','excess_quantity','quality_issue','expired','changed_mind','other') NOT NULL,
  `return_type` enum('full_return','partial_return','exchange') NOT NULL DEFAULT 'partial_return',
  `subtotal` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `restocking_fee` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `refund_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `refund_status` enum('pending','partial','completed','credited') NOT NULL DEFAULT 'pending',
  `status` enum('draft','requested','approved','received','completed','cancelled') NOT NULL DEFAULT 'draft',
  `approval_notes` text DEFAULT NULL,
  `received_by` int(11) DEFAULT NULL,
  `received_date` date DEFAULT NULL,
  `inspection_notes` text DEFAULT NULL,
  `customer_notes` text DEFAULT NULL,
  `internal_notes` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sales_returns_return_number_unique` (`return_number`),
  KEY `sales_returns_invoice_id_foreign` (`invoice_id`),
  KEY `sales_returns_customer_id_foreign` (`customer_id`),
  KEY `sales_returns_warehouse_id_foreign` (`warehouse_id`),
  CONSTRAINT `sales_returns_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `sales_returns_invoice_id_foreign` FOREIGN KEY (`invoice_id`) REFERENCES `sales_invoices` (`id`),
  CONSTRAINT `sales_returns_warehouse_id_foreign` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_returns`
--

LOCK TABLES `sales_returns` WRITE;
/*!40000 ALTER TABLE `sales_returns` DISABLE KEYS */;
/*!40000 ALTER TABLE `sales_returns` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_taxes`
--

DROP TABLE IF EXISTS `sales_taxes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sales_taxes` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `tax_code` varchar(20) NOT NULL,
  `name_ar` varchar(100) NOT NULL,
  `name_en` varchar(100) DEFAULT NULL,
  `tax_rate` decimal(5,2) NOT NULL,
  `tax_type` enum('vat','sales_tax','excise','withholding','other') NOT NULL DEFAULT 'vat',
  `calculation_method` enum('on_total','on_subtotal','exclusive','inclusive') NOT NULL DEFAULT 'on_subtotal',
  `is_collectable` tinyint(1) NOT NULL DEFAULT 1,
  `account_id` int(10) unsigned DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `notes` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sales_taxes_tax_code_unique` (`tax_code`),
  KEY `sales_taxes_account_id_foreign` (`account_id`),
  KEY `sales_taxes_is_active_index` (`is_active`),
  CONSTRAINT `sales_taxes_account_id_foreign` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`AccID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_taxes`
--

LOCK TABLES `sales_taxes` WRITE;
/*!40000 ALTER TABLE `sales_taxes` DISABLE KEYS */;
/*!40000 ALTER TABLE `sales_taxes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sectors`
--

DROP TABLE IF EXISTS `sectors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sectors` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name_ar` varchar(255) NOT NULL,
  `name_en` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sectors`
--

LOCK TABLES `sectors` WRITE;
/*!40000 ALTER TABLE `sectors` DISABLE KEYS */;
/*!40000 ALTER TABLE `sectors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `payload` longtext NOT NULL,
  `last_activity` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessions`
--

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
INSERT INTO `sessions` VALUES ('7M33VULbs5xnXoAalFzn6ePjoVQGIOFkRMhoJoLi',NULL,'54.39.210.17','Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)','YTozOntzOjY6Il90b2tlbiI7czo0MDoiNVJNeDdETVRTSGFScThRRHd3eXhVVjhhSTQxeVFTUXpSckVRb3AzeSI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MjA6Imh0dHBzOi8vem9kaWNzeXMuY29tIjtzOjU6InJvdXRlIjtzOjg6ImZyb250ZW5kIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==',1772711347),('GVduHyScO4r7Ge08koi6q5LidUY5GCtY5hcrQIT4',NULL,'2a02:4780:1::3','Go-http-client/2.0','YToyOntzOjY6Il90b2tlbiI7czo0MDoicFF3OGNZTVZpWENFbW83OTd6ZUZwbTN4bkF3UnpFQ0kyRzZHcTNDRiI7czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==',1772707079);
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `states`
--

DROP TABLE IF EXISTS `states`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `states` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name_ar` varchar(255) NOT NULL,
  `name_en` varchar(255) DEFAULT NULL,
  `country_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `states_country_id_foreign` (`country_id`),
  CONSTRAINT `states_country_id_foreign` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `states`
--

LOCK TABLES `states` WRITE;
/*!40000 ALTER TABLE `states` DISABLE KEYS */;
/*!40000 ALTER TABLE `states` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sub_industries`
--

DROP TABLE IF EXISTS `sub_industries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sub_industries` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `sub_industry_code` varchar(50) NOT NULL,
  `gics_sub_industry_code` varchar(10) DEFAULT NULL,
  `trbc_sub_industry_code` varchar(10) DEFAULT NULL,
  `sub_industry_name_ar` varchar(200) NOT NULL,
  `sub_industry_name_en` varchar(200) NOT NULL,
  `description_ar` text DEFAULT NULL,
  `description_en` text DEFAULT NULL,
  `industry_id` bigint(20) unsigned NOT NULL,
  `parent_sub_industry_id` bigint(20) unsigned DEFAULT NULL,
  `level` int(11) NOT NULL DEFAULT 3,
  `path` varchar(500) DEFAULT NULL,
  `growth_rate` decimal(10,4) DEFAULT NULL,
  `market_size` decimal(20,4) DEFAULT NULL,
  `competitive_intensity` enum('high','medium','low') NOT NULL DEFAULT 'medium',
  `technology_intensity` enum('high_tech','medium_tech','low_tech') NOT NULL DEFAULT 'medium_tech',
  `average_market_share_concentration` decimal(10,4) DEFAULT NULL,
  `average_innovation_rate` decimal(10,4) DEFAULT NULL,
  `average_customer_switching_costs` enum('high','medium','low') NOT NULL DEFAULT 'medium',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `display_order` int(11) NOT NULL DEFAULT 0,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sub_industries_sub_industry_code_unique` (`sub_industry_code`),
  KEY `idx_sub_industry_code` (`sub_industry_code`),
  KEY `idx_industry_sub` (`industry_id`,`sub_industry_code`),
  KEY `idx_gics_sub` (`gics_sub_industry_code`),
  KEY `idx_parent_sub` (`parent_sub_industry_id`),
  CONSTRAINT `sub_industries_industry_id_foreign` FOREIGN KEY (`industry_id`) REFERENCES `industries` (`id`),
  CONSTRAINT `sub_industries_parent_sub_industry_id_foreign` FOREIGN KEY (`parent_sub_industry_id`) REFERENCES `sub_industries` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sub_industries`
--

LOCK TABLES `sub_industries` WRITE;
/*!40000 ALTER TABLE `sub_industries` DISABLE KEYS */;
/*!40000 ALTER TABLE `sub_industries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier_addresses`
--

DROP TABLE IF EXISTS `supplier_addresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `supplier_addresses` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `supplier_id` bigint(20) unsigned NOT NULL,
  `address_type` enum('main','billing','shipping','returns') NOT NULL DEFAULT 'main',
  `address_name` varchar(100) DEFAULT NULL,
  `country_id` bigint(20) unsigned DEFAULT NULL,
  `city_id` bigint(20) unsigned DEFAULT NULL,
  `district` varchar(100) DEFAULT NULL,
  `street` varchar(255) DEFAULT NULL,
  `building_number` varchar(50) DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `po_box` varchar(50) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `mobile` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `supplier_addresses_country_id_foreign` (`country_id`),
  KEY `supplier_addresses_city_id_foreign` (`city_id`),
  KEY `idx_supplier_addresses_supplier` (`supplier_id`),
  KEY `idx_supplier_addresses_type` (`address_type`),
  CONSTRAINT `supplier_addresses_city_id_foreign` FOREIGN KEY (`city_id`) REFERENCES `cities` (`id`),
  CONSTRAINT `supplier_addresses_country_id_foreign` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`),
  CONSTRAINT `supplier_addresses_supplier_id_foreign` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='عناوين الموردين المتعددة';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_addresses`
--

LOCK TABLES `supplier_addresses` WRITE;
/*!40000 ALTER TABLE `supplier_addresses` DISABLE KEYS */;
/*!40000 ALTER TABLE `supplier_addresses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier_contacts`
--

DROP TABLE IF EXISTS `supplier_contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `supplier_contacts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `supplier_id` bigint(20) unsigned NOT NULL,
  `name_ar` varchar(255) NOT NULL,
  `name_en` varchar(255) DEFAULT NULL,
  `position_ar` varchar(100) DEFAULT NULL,
  `position_en` varchar(100) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `mobile` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `whatsapp` varchar(20) DEFAULT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `receive_statements` tinyint(1) NOT NULL DEFAULT 0,
  `receive_notifications` tinyint(1) NOT NULL DEFAULT 0,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_supplier_contacts_supplier` (`supplier_id`),
  KEY `idx_supplier_contacts_primary` (`is_primary`),
  CONSTRAINT `supplier_contacts_supplier_id_foreign` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='جهات الاتصال الخاصة بالموردين';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_contacts`
--

LOCK TABLES `supplier_contacts` WRITE;
/*!40000 ALTER TABLE `supplier_contacts` DISABLE KEYS */;
/*!40000 ALTER TABLE `supplier_contacts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier_groups`
--

DROP TABLE IF EXISTS `supplier_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `supplier_groups` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `name_ar` varchar(100) NOT NULL,
  `name_en` varchar(100) DEFAULT NULL,
  `parent_id` bigint(20) unsigned DEFAULT NULL,
  `account_id` int(10) unsigned DEFAULT NULL,
  `payment_terms` int(11) NOT NULL DEFAULT 30,
  `default_credit_limit` decimal(15,2) NOT NULL DEFAULT 0.00,
  `default_tax_id` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_groups`
--

LOCK TABLES `supplier_groups` WRITE;
/*!40000 ALTER TABLE `supplier_groups` DISABLE KEYS */;
INSERT INTO `supplier_groups` VALUES (1,'GRP-DEFAULT','Default Group','Default Group',NULL,NULL,30,0.00,NULL,NULL,1,NULL,'2026-03-05 10:06:52','2026-03-05 10:06:52',NULL);
/*!40000 ALTER TABLE `supplier_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier_opening_balances`
--

DROP TABLE IF EXISTS `supplier_opening_balances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `supplier_opening_balances` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `supplier_id` bigint(20) unsigned NOT NULL,
  `financial_year` int(11) NOT NULL,
  `opening_date` date NOT NULL,
  `currency_id` bigint(20) unsigned NOT NULL,
  `exchange_rate` decimal(15,6) NOT NULL,
  `debit_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `credit_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `base_debit_amount` decimal(15,2) GENERATED ALWAYS AS (`debit_amount` * `exchange_rate`) STORED,
  `base_credit_amount` decimal(15,2) GENERATED ALWAYS AS (`credit_amount` * `exchange_rate`) STORED,
  `net_balance` decimal(15,2) GENERATED ALWAYS AS (`credit_amount` - `debit_amount`) STORED,
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `approved_by` bigint(20) unsigned DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_supplier_year` (`supplier_id`,`financial_year`),
  KEY `supplier_opening_balances_currency_id_foreign` (`currency_id`),
  KEY `idx_opening_balances_supplier` (`supplier_id`),
  KEY `idx_opening_balances_year` (`financial_year`),
  CONSTRAINT `supplier_opening_balances_currency_id_foreign` FOREIGN KEY (`currency_id`) REFERENCES `currencies` (`id`),
  CONSTRAINT `supplier_opening_balances_supplier_id_foreign` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الأرصدة الافتتاحية للموردين لكل سنة مالية';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_opening_balances`
--

LOCK TABLES `supplier_opening_balances` WRITE;
/*!40000 ALTER TABLE `supplier_opening_balances` DISABLE KEYS */;
/*!40000 ALTER TABLE `supplier_opening_balances` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier_payment_allocations`
--

DROP TABLE IF EXISTS `supplier_payment_allocations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `supplier_payment_allocations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `payment_id` bigint(20) unsigned NOT NULL,
  `invoice_id` bigint(20) unsigned NOT NULL,
  `allocated_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `base_allocated_amount` decimal(15,2) DEFAULT NULL,
  `discount_given` decimal(15,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_payment_invoice` (`payment_id`,`invoice_id`),
  KEY `idx_payment_allocations_payment` (`payment_id`),
  KEY `idx_payment_allocations_invoice` (`invoice_id`),
  CONSTRAINT `supplier_payment_allocations_invoice_id_foreign` FOREIGN KEY (`invoice_id`) REFERENCES `purchase_invoices` (`id`),
  CONSTRAINT `supplier_payment_allocations_payment_id_foreign` FOREIGN KEY (`payment_id`) REFERENCES `supplier_payments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='تخصيص المدفوعات على الفواتير';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_payment_allocations`
--

LOCK TABLES `supplier_payment_allocations` WRITE;
/*!40000 ALTER TABLE `supplier_payment_allocations` DISABLE KEYS */;
/*!40000 ALTER TABLE `supplier_payment_allocations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier_payments`
--

DROP TABLE IF EXISTS `supplier_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `supplier_payments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `payment_number` varchar(50) NOT NULL,
  `supplier_id` bigint(20) unsigned NOT NULL,
  `currency_id` bigint(20) unsigned NOT NULL,
  `exchange_rate` decimal(15,6) NOT NULL DEFAULT 1.000000,
  `payment_date` date NOT NULL,
  `payment_method` enum('cash','check','bank_transfer','credit_card','credit_note','other') NOT NULL,
  `amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `base_amount` decimal(15,2) GENERATED ALWAYS AS (`amount` * `exchange_rate`) STORED,
  `payment_type` enum('invoice_payment','advance_payment','credit_payment','adjustment') NOT NULL DEFAULT 'invoice_payment',
  `bank_account_id` bigint(20) unsigned DEFAULT NULL,
  `check_number` varchar(50) DEFAULT NULL,
  `check_date` date DEFAULT NULL,
  `check_due_date` date DEFAULT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `status` enum('draft','posted','reconciled','cancelled') NOT NULL DEFAULT 'draft',
  `is_posted` tinyint(1) NOT NULL DEFAULT 0,
  `posted_at` timestamp NULL DEFAULT NULL,
  `posted_by` bigint(20) unsigned DEFAULT NULL,
  `reconciled_at` timestamp NULL DEFAULT NULL,
  `reconciled_by` bigint(20) unsigned DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `supplier_payments_payment_number_unique` (`payment_number`),
  KEY `supplier_payments_currency_id_foreign` (`currency_id`),
  KEY `supplier_payments_bank_account_id_foreign` (`bank_account_id`),
  KEY `idx_payments_number` (`payment_number`),
  KEY `idx_payments_date` (`payment_date`),
  KEY `idx_payments_supplier` (`supplier_id`),
  KEY `idx_payments_method` (`payment_method`),
  KEY `idx_payments_status` (`status`),
  CONSTRAINT `supplier_payments_bank_account_id_foreign` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`),
  CONSTRAINT `supplier_payments_currency_id_foreign` FOREIGN KEY (`currency_id`) REFERENCES `currencies` (`id`),
  CONSTRAINT `supplier_payments_supplier_id_foreign` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='مدفوعات الموردين';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_payments`
--

LOCK TABLES `supplier_payments` WRITE;
/*!40000 ALTER TABLE `supplier_payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `supplier_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier_statement_details`
--

DROP TABLE IF EXISTS `supplier_statement_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `supplier_statement_details` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `statement_id` bigint(20) unsigned NOT NULL,
  `transaction_date` date NOT NULL,
  `document_type` enum('invoice','payment','credit_note','debit_note','adjustment') NOT NULL,
  `document_id` bigint(20) unsigned NOT NULL,
  `document_number` varchar(50) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `debit_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `credit_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `balance` decimal(15,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_statement_details_statement` (`statement_id`),
  KEY `idx_statement_details_document` (`document_type`,`document_id`),
  CONSTRAINT `supplier_statement_details_statement_id_foreign` FOREIGN KEY (`statement_id`) REFERENCES `supplier_statements` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='تفاصيل حركات كشف حساب المورد';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_statement_details`
--

LOCK TABLES `supplier_statement_details` WRITE;
/*!40000 ALTER TABLE `supplier_statement_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `supplier_statement_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier_statements`
--

DROP TABLE IF EXISTS `supplier_statements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `supplier_statements` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `statement_number` varchar(50) NOT NULL,
  `supplier_id` bigint(20) unsigned NOT NULL,
  `currency_id` bigint(20) unsigned NOT NULL,
  `statement_date` date NOT NULL,
  `period_from` date NOT NULL,
  `period_to` date NOT NULL,
  `opening_balance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_invoices` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_payments` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_adjustments` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_credit_notes` decimal(15,2) NOT NULL DEFAULT 0.00,
  `closing_balance` decimal(15,2) GENERATED ALWAYS AS (`opening_balance` + `total_invoices` - `total_payments` + `total_adjustments` - `total_credit_notes`) STORED,
  `base_closing_balance` decimal(15,2) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `is_sent` tinyint(1) NOT NULL DEFAULT 0,
  `sent_date` date DEFAULT NULL,
  `sent_method` enum('email','print','both') DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `supplier_statements_statement_number_unique` (`statement_number`),
  KEY `supplier_statements_currency_id_foreign` (`currency_id`),
  KEY `idx_statements_number` (`statement_number`),
  KEY `idx_statements_supplier` (`supplier_id`),
  KEY `idx_statements_date` (`statement_date`),
  CONSTRAINT `supplier_statements_currency_id_foreign` FOREIGN KEY (`currency_id`) REFERENCES `currencies` (`id`),
  CONSTRAINT `supplier_statements_supplier_id_foreign` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='كشوفات حساب الموردين';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_statements`
--

LOCK TABLES `supplier_statements` WRITE;
/*!40000 ALTER TABLE `supplier_statements` DISABLE KEYS */;
/*!40000 ALTER TABLE `supplier_statements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `suppliers`
--

DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `suppliers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `supplier_code` varchar(50) NOT NULL,
  `name_ar` varchar(255) NOT NULL,
  `name_en` varchar(255) DEFAULT NULL,
  `supplier_group_id` bigint(20) unsigned NOT NULL,
  `account_id` int(10) unsigned DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `currency_id` bigint(20) unsigned NOT NULL DEFAULT 1,
  `tax_number` varchar(100) DEFAULT NULL,
  `commercial_register` varchar(100) DEFAULT NULL,
  `tax_file_number` varchar(100) DEFAULT NULL,
  `credit_limit` decimal(15,2) NOT NULL DEFAULT 0.00,
  `current_balance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `available_credit` decimal(15,2) GENERATED ALWAYS AS (`credit_limit` - `current_balance`) STORED,
  `payment_terms` int(11) NOT NULL DEFAULT 30,
  `default_payment_method` enum('cash','check','transfer','credit') NOT NULL DEFAULT 'cash',
  `default_warehouse_id` bigint(20) unsigned DEFAULT NULL,
  `country_id` bigint(20) unsigned DEFAULT NULL,
  `city_id` bigint(20) unsigned DEFAULT NULL,
  `primary_phone` varchar(20) DEFAULT NULL,
  `secondary_phone` varchar(20) DEFAULT NULL,
  `fax` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `is_vendor` tinyint(1) NOT NULL DEFAULT 1,
  `is_manufacturer` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `rating` tinyint(4) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `store_name_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`store_name_json`)),
  `store_description_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`store_description_json`)),
  `commission_rate` decimal(5,2) NOT NULL DEFAULT 0.00,
  `verification_status` varchar(255) NOT NULL DEFAULT 'unverified',
  PRIMARY KEY (`id`),
  UNIQUE KEY `suppliers_supplier_code_unique` (`supplier_code`),
  KEY `idx_suppliers_code` (`supplier_code`),
  KEY `idx_suppliers_name` (`name_ar`),
  KEY `idx_suppliers_group` (`supplier_group_id`),
  KEY `idx_suppliers_active` (`is_active`),
  KEY `suppliers_account_id_foreign` (`account_id`),
  KEY `suppliers_currency_id_foreign` (`currency_id`),
  KEY `suppliers_default_warehouse_id_foreign` (`default_warehouse_id`),
  KEY `suppliers_country_id_foreign` (`country_id`),
  KEY `suppliers_city_id_foreign` (`city_id`),
  CONSTRAINT `suppliers_account_id_foreign` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`AccID`) ON DELETE SET NULL,
  CONSTRAINT `suppliers_city_id_foreign` FOREIGN KEY (`city_id`) REFERENCES `cities` (`id`) ON DELETE SET NULL,
  CONSTRAINT `suppliers_country_id_foreign` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`) ON DELETE SET NULL,
  CONSTRAINT `suppliers_currency_id_foreign` FOREIGN KEY (`currency_id`) REFERENCES `currencies` (`id`),
  CONSTRAINT `suppliers_default_warehouse_id_foreign` FOREIGN KEY (`default_warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suppliers`
--

LOCK TABLES `suppliers` WRITE;
/*!40000 ALTER TABLE `suppliers` DISABLE KEYS */;
INSERT INTO `suppliers` VALUES (1,'VEN-10001','حياه ستور','Hayah Store',1,NULL,'$2y$12$Jqfz3afEN7FTSMwh4fUX7eKJGc.V4ke4MxqHVliUJERhdqhASrVVm',1,NULL,NULL,NULL,0.00,0.00,0.00,30,'cash',NULL,NULL,NULL,NULL,NULL,NULL,'HayahStore@right-eg.com',NULL,1,0,1,0,NULL,NULL,'2026-03-05 10:06:54','2026-03-05 10:06:54',NULL,NULL,NULL,0.00,'pending');
/*!40000 ALTER TABLE `suppliers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_assignments`
--

DROP TABLE IF EXISTS `task_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `task_assignments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `task_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `assigned_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `task_assignments_task_id_foreign` (`task_id`),
  KEY `task_assignments_user_id_foreign` (`user_id`),
  CONSTRAINT `task_assignments_task_id_foreign` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`),
  CONSTRAINT `task_assignments_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_assignments`
--

LOCK TABLES `task_assignments` WRITE;
/*!40000 ALTER TABLE `task_assignments` DISABLE KEYS */;
/*!40000 ALTER TABLE `task_assignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_attachments`
--

DROP TABLE IF EXISTS `task_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `task_attachments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `task_id` bigint(20) unsigned NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `task_attachments_task_id_foreign` (`task_id`),
  CONSTRAINT `task_attachments_task_id_foreign` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_attachments`
--

LOCK TABLES `task_attachments` WRITE;
/*!40000 ALTER TABLE `task_attachments` DISABLE KEYS */;
/*!40000 ALTER TABLE `task_attachments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_categories`
--

DROP TABLE IF EXISTS `task_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `task_categories` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_categories`
--

LOCK TABLES `task_categories` WRITE;
/*!40000 ALTER TABLE `task_categories` DISABLE KEYS */;
/*!40000 ALTER TABLE `task_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_comments`
--

DROP TABLE IF EXISTS `task_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `task_comments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `task_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `comment` text NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `task_comments_task_id_foreign` (`task_id`),
  KEY `task_comments_user_id_foreign` (`user_id`),
  CONSTRAINT `task_comments_task_id_foreign` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`),
  CONSTRAINT `task_comments_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_comments`
--

LOCK TABLES `task_comments` WRITE;
/*!40000 ALTER TABLE `task_comments` DISABLE KEYS */;
/*!40000 ALTER TABLE `task_comments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_priorities`
--

DROP TABLE IF EXISTS `task_priorities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `task_priorities` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `level` int(11) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_priorities`
--

LOCK TABLES `task_priorities` WRITE;
/*!40000 ALTER TABLE `task_priorities` DISABLE KEYS */;
/*!40000 ALTER TABLE `task_priorities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_statuses`
--

DROP TABLE IF EXISTS `task_statuses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `task_statuses` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_statuses`
--

LOCK TABLES `task_statuses` WRITE;
/*!40000 ALTER TABLE `task_statuses` DISABLE KEYS */;
/*!40000 ALTER TABLE `task_statuses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tasks`
--

DROP TABLE IF EXISTS `tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tasks` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `category_id` bigint(20) unsigned NOT NULL,
  `priority_id` bigint(20) unsigned NOT NULL,
  `status_id` bigint(20) unsigned NOT NULL,
  `created_by` bigint(20) unsigned NOT NULL,
  `due_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tasks_category_id_foreign` (`category_id`),
  KEY `tasks_priority_id_foreign` (`priority_id`),
  KEY `tasks_status_id_foreign` (`status_id`),
  KEY `tasks_created_by_foreign` (`created_by`),
  CONSTRAINT `tasks_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `task_categories` (`id`),
  CONSTRAINT `tasks_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tasks_priority_id_foreign` FOREIGN KEY (`priority_id`) REFERENCES `task_priorities` (`id`),
  CONSTRAINT `tasks_status_id_foreign` FOREIGN KEY (`status_id`) REFERENCES `task_statuses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tasks`
--

LOCK TABLES `tasks` WRITE;
/*!40000 ALTER TABLE `tasks` DISABLE KEYS */;
/*!40000 ALTER TABLE `tasks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tax_audit_log`
--

DROP TABLE IF EXISTS `tax_audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tax_audit_log` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `log_date` datetime NOT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `action_type` enum('create','update','delete','calculate','submit','approve','reject') NOT NULL,
  `table_name` varchar(100) NOT NULL,
  `record_id` bigint(20) unsigned NOT NULL,
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_values`)),
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_values`)),
  `changed_fields` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`changed_fields`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `session_id` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_log_date` (`log_date`),
  KEY `idx_action_type` (`action_type`),
  KEY `idx_table_record` (`table_name`,`record_id`),
  KEY `tax_audit_log_user_id_foreign` (`user_id`),
  CONSTRAINT `tax_audit_log_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tax_audit_log`
--

LOCK TABLES `tax_audit_log` WRITE;
/*!40000 ALTER TABLE `tax_audit_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `tax_audit_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tax_exemptions`
--

DROP TABLE IF EXISTS `tax_exemptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tax_exemptions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `exemption_code` varchar(100) NOT NULL,
  `name_ar` varchar(200) NOT NULL,
  `name_en` varchar(200) NOT NULL,
  `country_id` bigint(20) unsigned NOT NULL,
  `exemption_type` enum('customer','product','service','document','special') NOT NULL,
  `customer_id` int(10) unsigned DEFAULT NULL,
  `product_id` bigint(20) unsigned DEFAULT NULL,
  `service_id` bigint(20) unsigned DEFAULT NULL,
  `document_type` enum('invoice','receipt','credit_note','debit_note','all') DEFAULT NULL,
  `exempted_tax_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`exempted_tax_ids`)),
  `exemption_percentage` decimal(5,2) NOT NULL DEFAULT 100.00,
  `legal_basis` varchar(500) DEFAULT NULL,
  `certificate_number` varchar(100) DEFAULT NULL,
  `certificate_expiry` date DEFAULT NULL,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `requires_certificate` tinyint(1) NOT NULL DEFAULT 0,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `approved_by` bigint(20) unsigned DEFAULT NULL,
  `approved_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tax_exemptions_exemption_code_unique` (`exemption_code`),
  KEY `tax_exemptions_country_id_foreign` (`country_id`),
  KEY `tax_exemptions_customer_id_foreign` (`customer_id`),
  KEY `tax_exemptions_product_id_foreign` (`product_id`),
  KEY `idx_exemption_type` (`exemption_type`),
  KEY `idx_certificate` (`certificate_number`),
  KEY `idx_effective` (`effective_from`,`effective_to`),
  CONSTRAINT `tax_exemptions_country_id_foreign` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`),
  CONSTRAINT `tax_exemptions_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `tax_exemptions_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tax_exemptions`
--

LOCK TABLES `tax_exemptions` WRITE;
/*!40000 ALTER TABLE `tax_exemptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `tax_exemptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tax_group_details`
--

DROP TABLE IF EXISTS `tax_group_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tax_group_details` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tax_group_id` bigint(20) unsigned NOT NULL,
  `tax_id` bigint(20) unsigned NOT NULL,
  `sequence_number` int(11) NOT NULL,
  `is_compound_on_previous` tinyint(1) NOT NULL DEFAULT 0,
  `compound_base_tax_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`compound_base_tax_ids`)),
  `apply_to_subtotal` tinyint(1) NOT NULL DEFAULT 1,
  `include_in_total` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_tax_group_tax` (`tax_group_id`,`tax_id`),
  KEY `tax_group_details_tax_id_foreign` (`tax_id`),
  KEY `idx_sequence` (`tax_group_id`,`sequence_number`),
  CONSTRAINT `tax_group_details_tax_group_id_foreign` FOREIGN KEY (`tax_group_id`) REFERENCES `tax_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tax_group_details_tax_id_foreign` FOREIGN KEY (`tax_id`) REFERENCES `taxes` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tax_group_details`
--

LOCK TABLES `tax_group_details` WRITE;
/*!40000 ALTER TABLE `tax_group_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `tax_group_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tax_groups`
--

DROP TABLE IF EXISTS `tax_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tax_groups` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `group_code` varchar(50) NOT NULL,
  `name_ar` varchar(200) NOT NULL,
  `name_en` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `country_id` bigint(20) unsigned DEFAULT NULL,
  `apply_to` enum('sales','purchases','both','specific') NOT NULL DEFAULT 'both',
  `is_compound` tinyint(1) NOT NULL DEFAULT 0,
  `calculation_order` int(11) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tax_groups_group_code_unique` (`group_code`),
  KEY `idx_group_country` (`country_id`),
  CONSTRAINT `tax_groups_country_id_foreign` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tax_groups`
--

LOCK TABLES `tax_groups` WRITE;
/*!40000 ALTER TABLE `tax_groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `tax_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tax_invoice_details`
--

DROP TABLE IF EXISTS `tax_invoice_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tax_invoice_details` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tax_invoice_id` bigint(20) unsigned NOT NULL,
  `line_number` int(11) NOT NULL,
  `item_type` enum('product','service','other') NOT NULL,
  `item_id` bigint(20) unsigned DEFAULT NULL,
  `description_ar` varchar(500) DEFAULT NULL,
  `description_en` varchar(500) DEFAULT NULL,
  `quantity` decimal(15,3) NOT NULL DEFAULT 1.000,
  `unit_price` decimal(20,4) NOT NULL,
  `unit_discount` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `line_total` decimal(20,4) NOT NULL,
  `tax_id` bigint(20) unsigned DEFAULT NULL,
  `tax_rate` decimal(10,4) DEFAULT NULL,
  `tax_amount` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `taxable_amount` decimal(20,4) NOT NULL,
  `unit_id` bigint(20) unsigned DEFAULT NULL,
  `currency_id` bigint(20) unsigned NOT NULL,
  `tax_exemption_id` bigint(20) unsigned DEFAULT NULL,
  `exemption_reason` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `tax_invoice_details_unit_id_foreign` (`unit_id`),
  KEY `tax_invoice_details_tax_id_foreign` (`tax_id`),
  KEY `tax_invoice_details_currency_id_foreign` (`currency_id`),
  KEY `tax_invoice_details_tax_exemption_id_foreign` (`tax_exemption_id`),
  KEY `idx_invoice_line` (`tax_invoice_id`,`line_number`),
  CONSTRAINT `tax_invoice_details_currency_id_foreign` FOREIGN KEY (`currency_id`) REFERENCES `currencies` (`id`),
  CONSTRAINT `tax_invoice_details_tax_exemption_id_foreign` FOREIGN KEY (`tax_exemption_id`) REFERENCES `tax_exemptions` (`id`),
  CONSTRAINT `tax_invoice_details_tax_id_foreign` FOREIGN KEY (`tax_id`) REFERENCES `taxes` (`id`),
  CONSTRAINT `tax_invoice_details_tax_invoice_id_foreign` FOREIGN KEY (`tax_invoice_id`) REFERENCES `tax_invoices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tax_invoice_details_unit_id_foreign` FOREIGN KEY (`unit_id`) REFERENCES `item_units` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tax_invoice_details`
--

LOCK TABLES `tax_invoice_details` WRITE;
/*!40000 ALTER TABLE `tax_invoice_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `tax_invoice_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tax_invoices`
--

DROP TABLE IF EXISTS `tax_invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tax_invoices` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `invoice_number` varchar(100) NOT NULL,
  `original_invoice_id` bigint(20) unsigned DEFAULT NULL,
  `document_type` enum('tax_invoice','simplified_invoice','credit_note','debit_note') NOT NULL,
  `transaction_type` enum('sale','purchase','expense','receipt') NOT NULL,
  `issuer_id` bigint(20) unsigned NOT NULL,
  `issuer_type` enum('customer','vendor','company') NOT NULL,
  `recipient_id` bigint(20) unsigned NOT NULL,
  `recipient_type` enum('customer','vendor','company') NOT NULL,
  `tax_group_id` bigint(20) unsigned DEFAULT NULL,
  `tax_amount` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `taxable_amount` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `total_amount` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `invoice_date` date NOT NULL,
  `due_date` date DEFAULT NULL,
  `tax_point_date` date DEFAULT NULL,
  `tax_authority_number` varchar(100) DEFAULT NULL,
  `qr_code_data` text DEFAULT NULL,
  `digital_signature` varchar(500) DEFAULT NULL,
  `status` enum('draft','issued','cancelled','reversed','archived') NOT NULL DEFAULT 'draft',
  `is_export` tinyint(1) NOT NULL DEFAULT 0,
  `is_reverse_charge` tinyint(1) NOT NULL DEFAULT 0,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `issued_by` bigint(20) unsigned DEFAULT NULL,
  `issued_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tax_invoices_invoice_number_unique` (`invoice_number`),
  KEY `tax_invoices_tax_group_id_foreign` (`tax_group_id`),
  KEY `tax_invoices_original_invoice_id_foreign` (`original_invoice_id`),
  KEY `idx_invoice_date` (`invoice_date`),
  KEY `idx_document_type` (`document_type`),
  KEY `idx_tax_authority` (`tax_authority_number`),
  CONSTRAINT `tax_invoices_original_invoice_id_foreign` FOREIGN KEY (`original_invoice_id`) REFERENCES `tax_invoices` (`id`),
  CONSTRAINT `tax_invoices_tax_group_id_foreign` FOREIGN KEY (`tax_group_id`) REFERENCES `tax_groups` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tax_invoices`
--

LOCK TABLES `tax_invoices` WRITE;
/*!40000 ALTER TABLE `tax_invoices` DISABLE KEYS */;
/*!40000 ALTER TABLE `tax_invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tax_payments`
--

DROP TABLE IF EXISTS `tax_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tax_payments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `payment_number` varchar(100) NOT NULL,
  `tax_return_id` bigint(20) unsigned DEFAULT NULL,
  `payment_date` date NOT NULL,
  `payment_method` enum('bank_transfer','cheque','cash','credit_card','online') NOT NULL,
  `payment_amount` decimal(20,4) NOT NULL,
  `currency_id` bigint(20) unsigned NOT NULL,
  `exchange_rate` decimal(20,6) NOT NULL DEFAULT 1.000000,
  `bank_account_id` bigint(20) unsigned DEFAULT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `transaction_id` varchar(200) DEFAULT NULL,
  `status` enum('pending','processing','completed','failed','reversed') NOT NULL DEFAULT 'pending',
  `clearance_date` date DEFAULT NULL,
  `bank_charges` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `late_fees` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `interest_amount` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `payment_by` bigint(20) unsigned DEFAULT NULL,
  `verified_by` bigint(20) unsigned DEFAULT NULL,
  `verified_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tax_payments_payment_number_unique` (`payment_number`),
  KEY `tax_payments_tax_return_id_foreign` (`tax_return_id`),
  KEY `tax_payments_currency_id_foreign` (`currency_id`),
  KEY `tax_payments_bank_account_id_foreign` (`bank_account_id`),
  KEY `idx_payment_date` (`payment_date`),
  KEY `idx_payment_status` (`status`),
  CONSTRAINT `tax_payments_bank_account_id_foreign` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`),
  CONSTRAINT `tax_payments_currency_id_foreign` FOREIGN KEY (`currency_id`) REFERENCES `currencies` (`id`),
  CONSTRAINT `tax_payments_tax_return_id_foreign` FOREIGN KEY (`tax_return_id`) REFERENCES `tax_returns` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tax_payments`
--

LOCK TABLES `tax_payments` WRITE;
/*!40000 ALTER TABLE `tax_payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `tax_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tax_periods`
--

DROP TABLE IF EXISTS `tax_periods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tax_periods` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `period_code` varchar(50) NOT NULL,
  `country_id` bigint(20) unsigned NOT NULL,
  `tax_type_id` bigint(20) unsigned NOT NULL,
  `period_type` enum('monthly','quarterly','semi_annual','annual','custom') NOT NULL,
  `period_year` int(11) NOT NULL,
  `period_number` int(11) DEFAULT NULL,
  `period_name_ar` varchar(100) NOT NULL,
  `period_name_en` varchar(100) DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `due_date` date NOT NULL,
  `filing_deadline` date NOT NULL,
  `status` enum('open','closed','locked','extended') NOT NULL DEFAULT 'open',
  `is_extended` tinyint(1) NOT NULL DEFAULT 0,
  `extension_days` int(11) NOT NULL DEFAULT 0,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `closed_by` bigint(20) unsigned DEFAULT NULL,
  `closed_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tax_periods_period_code_unique` (`period_code`),
  UNIQUE KEY `unique_tax_period` (`country_id`,`tax_type_id`,`period_year`,`period_number`),
  KEY `tax_periods_tax_type_id_foreign` (`tax_type_id`),
  KEY `idx_period_dates` (`start_date`,`end_date`),
  KEY `idx_due_date` (`due_date`),
  CONSTRAINT `tax_periods_country_id_foreign` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`),
  CONSTRAINT `tax_periods_tax_type_id_foreign` FOREIGN KEY (`tax_type_id`) REFERENCES `tax_types` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tax_periods`
--

LOCK TABLES `tax_periods` WRITE;
/*!40000 ALTER TABLE `tax_periods` DISABLE KEYS */;
/*!40000 ALTER TABLE `tax_periods` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tax_returns`
--

DROP TABLE IF EXISTS `tax_returns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tax_returns` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `return_number` varchar(100) NOT NULL,
  `tax_period_id` bigint(20) unsigned NOT NULL,
  `entity_id` bigint(20) unsigned NOT NULL,
  `entity_type` enum('company','branch','division') NOT NULL DEFAULT 'company',
  `return_type` enum('original','amendment','supplementary') NOT NULL DEFAULT 'original',
  `filing_date` date DEFAULT NULL,
  `filing_method` enum('electronic','manual','portal') NOT NULL DEFAULT 'electronic',
  `taxable_amount` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `tax_amount` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `tax_paid` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `tax_due` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `tax_refund` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `tax_details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tax_details`)),
  `status` enum('draft','submitted','accepted','rejected','under_review','processed') NOT NULL DEFAULT 'draft',
  `assessment_number` varchar(100) DEFAULT NULL,
  `assessment_date` date DEFAULT NULL,
  `document_path` varchar(500) DEFAULT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `prepared_by` bigint(20) unsigned DEFAULT NULL,
  `reviewed_by` bigint(20) unsigned DEFAULT NULL,
  `approved_by` bigint(20) unsigned DEFAULT NULL,
  `submitted_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tax_returns_return_number_unique` (`return_number`),
  KEY `idx_return_status` (`status`),
  KEY `idx_filing_date` (`filing_date`),
  KEY `idx_tax_period` (`tax_period_id`),
  CONSTRAINT `tax_returns_tax_period_id_foreign` FOREIGN KEY (`tax_period_id`) REFERENCES `tax_periods` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tax_returns`
--

LOCK TABLES `tax_returns` WRITE;
/*!40000 ALTER TABLE `tax_returns` DISABLE KEYS */;
/*!40000 ALTER TABLE `tax_returns` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tax_rules`
--

DROP TABLE IF EXISTS `tax_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tax_rules` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `rule_code` varchar(100) NOT NULL,
  `name_ar` varchar(200) NOT NULL,
  `name_en` varchar(200) NOT NULL,
  `country_id` bigint(20) unsigned NOT NULL,
  `state_id` bigint(20) unsigned DEFAULT NULL,
  `city_id` bigint(20) unsigned DEFAULT NULL,
  `apply_to` enum('customer','vendor','product','service','category','all') NOT NULL,
  `customer_type` enum('business','individual','government','foreign','all') NOT NULL DEFAULT 'all',
  `vendor_type` enum('local','foreign','tax_registered','non_registered','all') NOT NULL DEFAULT 'all',
  `customer_id` int(10) unsigned DEFAULT NULL,
  `vendor_id` bigint(20) unsigned DEFAULT NULL,
  `product_category_id` bigint(20) unsigned DEFAULT NULL,
  `product_id` bigint(20) unsigned DEFAULT NULL,
  `service_id` bigint(20) unsigned DEFAULT NULL,
  `tax_id` bigint(20) unsigned DEFAULT NULL,
  `tax_group_id` bigint(20) unsigned DEFAULT NULL,
  `priority` int(11) NOT NULL DEFAULT 1,
  `is_exclusive` tinyint(1) NOT NULL DEFAULT 0,
  `minimum_amount` decimal(20,4) DEFAULT NULL,
  `maximum_amount` decimal(20,4) DEFAULT NULL,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tax_rules_rule_code_unique` (`rule_code`),
  KEY `tax_rules_city_id_foreign` (`city_id`),
  KEY `tax_rules_customer_id_foreign` (`customer_id`),
  KEY `tax_rules_vendor_id_foreign` (`vendor_id`),
  KEY `tax_rules_product_category_id_foreign` (`product_category_id`),
  KEY `tax_rules_product_id_foreign` (`product_id`),
  KEY `tax_rules_tax_id_foreign` (`tax_id`),
  KEY `tax_rules_tax_group_id_foreign` (`tax_group_id`),
  KEY `idx_rule_scope` (`country_id`,`state_id`,`city_id`),
  KEY `idx_effective_dates` (`effective_from`,`effective_to`),
  KEY `tax_rules_priority_index` (`priority`),
  CONSTRAINT `tax_rules_city_id_foreign` FOREIGN KEY (`city_id`) REFERENCES `cities` (`id`),
  CONSTRAINT `tax_rules_country_id_foreign` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`),
  CONSTRAINT `tax_rules_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `tax_rules_product_category_id_foreign` FOREIGN KEY (`product_category_id`) REFERENCES `categories` (`id`),
  CONSTRAINT `tax_rules_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `tax_rules_tax_group_id_foreign` FOREIGN KEY (`tax_group_id`) REFERENCES `tax_groups` (`id`),
  CONSTRAINT `tax_rules_tax_id_foreign` FOREIGN KEY (`tax_id`) REFERENCES `taxes` (`id`),
  CONSTRAINT `tax_rules_vendor_id_foreign` FOREIGN KEY (`vendor_id`) REFERENCES `suppliers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tax_rules`
--

LOCK TABLES `tax_rules` WRITE;
/*!40000 ALTER TABLE `tax_rules` DISABLE KEYS */;
/*!40000 ALTER TABLE `tax_rules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tax_settlements`
--

DROP TABLE IF EXISTS `tax_settlements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tax_settlements` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `settlement_number` varchar(100) NOT NULL,
  `tax_period_id` bigint(20) unsigned NOT NULL,
  `entity_id` bigint(20) unsigned NOT NULL,
  `settlement_date` date NOT NULL,
  `settlement_type` enum('payment','refund','adjustment','carry_forward') NOT NULL,
  `tax_due` decimal(20,4) NOT NULL,
  `tax_paid` decimal(20,4) NOT NULL,
  `tax_refundable` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `carry_forward_amount` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `vat_payable` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `vat_recoverable` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `net_vat` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `withholding_tax` decimal(20,4) NOT NULL DEFAULT 0.0000,
  `status` enum('calculated','reviewed','approved','settled') NOT NULL DEFAULT 'calculated',
  `calculated_by` bigint(20) unsigned DEFAULT NULL,
  `reviewed_by` bigint(20) unsigned DEFAULT NULL,
  `approved_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tax_settlements_settlement_number_unique` (`settlement_number`),
  KEY `tax_settlements_tax_period_id_foreign` (`tax_period_id`),
  KEY `idx_settlement_date` (`settlement_date`),
  KEY `idx_settlement_type` (`settlement_type`),
  CONSTRAINT `tax_settlements_tax_period_id_foreign` FOREIGN KEY (`tax_period_id`) REFERENCES `tax_periods` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tax_settlements`
--

LOCK TABLES `tax_settlements` WRITE;
/*!40000 ALTER TABLE `tax_settlements` DISABLE KEYS */;
/*!40000 ALTER TABLE `tax_settlements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tax_types`
--

DROP TABLE IF EXISTS `tax_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tax_types` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `name_ar` varchar(200) NOT NULL,
  `name_en` varchar(200) NOT NULL,
  `tax_category` enum('sales','purchase','income','withholding','excise','customs','property','other') NOT NULL,
  `tax_level` enum('federal','state','provincial','county','city','municipal','special') NOT NULL,
  `tax_system_code` varchar(50) DEFAULT NULL,
  `country_id` bigint(20) unsigned NOT NULL,
  `legal_reference` varchar(500) DEFAULT NULL,
  `effective_date` date NOT NULL,
  `expiry_date` date DEFAULT NULL,
  `is_recoverable` tinyint(1) NOT NULL DEFAULT 1,
  `is_withholding` tinyint(1) NOT NULL DEFAULT 0,
  `is_compound` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tax_types_code_unique` (`code`),
  KEY `idx_tax_category` (`tax_category`),
  KEY `idx_country` (`country_id`),
  KEY `idx_tax_system` (`tax_system_code`),
  CONSTRAINT `tax_types_country_id_foreign` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tax_types`
--

LOCK TABLES `tax_types` WRITE;
/*!40000 ALTER TABLE `tax_types` DISABLE KEYS */;
/*!40000 ALTER TABLE `tax_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tax_withholdings`
--

DROP TABLE IF EXISTS `tax_withholdings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tax_withholdings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `withholding_code` varchar(100) NOT NULL,
  `country_id` bigint(20) unsigned NOT NULL,
  `name_ar` varchar(200) NOT NULL,
  `name_en` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `withholding_rate` decimal(10,4) NOT NULL,
  `withholding_type` enum('percentage','fixed','tiered') NOT NULL DEFAULT 'percentage',
  `tier_details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tier_details`)),
  `apply_to` enum('payments','invoices','salaries','contracts','all') NOT NULL,
  `minimum_amount` decimal(20,4) DEFAULT NULL,
  `maximum_amount` decimal(20,4) DEFAULT NULL,
  `withholding_account_id` int(10) unsigned NOT NULL,
  `payable_account_id` int(10) unsigned NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tax_withholdings_withholding_code_unique` (`withholding_code`),
  KEY `tax_withholdings_withholding_account_id_foreign` (`withholding_account_id`),
  KEY `tax_withholdings_payable_account_id_foreign` (`payable_account_id`),
  KEY `idx_country_active` (`country_id`,`is_active`),
  CONSTRAINT `tax_withholdings_country_id_foreign` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`),
  CONSTRAINT `tax_withholdings_payable_account_id_foreign` FOREIGN KEY (`payable_account_id`) REFERENCES `accounts` (`AccID`),
  CONSTRAINT `tax_withholdings_withholding_account_id_foreign` FOREIGN KEY (`withholding_account_id`) REFERENCES `accounts` (`AccID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tax_withholdings`
--

LOCK TABLES `tax_withholdings` WRITE;
/*!40000 ALTER TABLE `tax_withholdings` DISABLE KEYS */;
/*!40000 ALTER TABLE `tax_withholdings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `taxes`
--

DROP TABLE IF EXISTS `taxes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `taxes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tax_type_id` bigint(20) unsigned NOT NULL,
  `tax_code` varchar(50) NOT NULL,
  `name_ar` varchar(200) NOT NULL,
  `name_en` varchar(200) NOT NULL,
  `description_ar` text DEFAULT NULL,
  `description_en` text DEFAULT NULL,
  `country_id` bigint(20) unsigned NOT NULL,
  `state_id` bigint(20) unsigned DEFAULT NULL,
  `city_id` bigint(20) unsigned DEFAULT NULL,
  `jurisdiction_code` varchar(100) DEFAULT NULL,
  `tax_rate` decimal(10,4) NOT NULL,
  `tax_amount` decimal(20,4) DEFAULT NULL,
  `calculation_method` enum('percentage','fixed','tiered','formula') NOT NULL DEFAULT 'percentage',
  `calculation_basis` enum('exclusive','inclusive','mixed') NOT NULL DEFAULT 'exclusive',
  `rounding_method` enum('normal','up','down','commercial') NOT NULL DEFAULT 'normal',
  `rounding_precision` int(11) NOT NULL DEFAULT 2,
  `minimum_amount` decimal(20,4) DEFAULT NULL,
  `maximum_amount` decimal(20,4) DEFAULT NULL,
  `threshold_amount` decimal(20,4) DEFAULT NULL,
  `recoverable_percentage` decimal(5,2) NOT NULL DEFAULT 100.00,
  `withholding_rate` decimal(10,4) DEFAULT NULL,
  `tax_account_id` int(10) unsigned NOT NULL,
  `expense_account_id` int(10) unsigned DEFAULT NULL,
  `payable_account_id` int(10) unsigned DEFAULT NULL,
  `receivable_account_id` int(10) unsigned DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `taxes_tax_code_unique` (`tax_code`),
  KEY `taxes_tax_type_id_foreign` (`tax_type_id`),
  KEY `taxes_city_id_foreign` (`city_id`),
  KEY `taxes_tax_account_id_foreign` (`tax_account_id`),
  KEY `taxes_expense_account_id_foreign` (`expense_account_id`),
  KEY `taxes_payable_account_id_foreign` (`payable_account_id`),
  KEY `taxes_receivable_account_id_foreign` (`receivable_account_id`),
  KEY `idx_tax_code` (`tax_code`),
  KEY `idx_country_state` (`country_id`,`state_id`),
  KEY `idx_effective_dates` (`effective_from`,`effective_to`),
  CONSTRAINT `taxes_city_id_foreign` FOREIGN KEY (`city_id`) REFERENCES `cities` (`id`) ON DELETE SET NULL,
  CONSTRAINT `taxes_country_id_foreign` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`) ON DELETE CASCADE,
  CONSTRAINT `taxes_expense_account_id_foreign` FOREIGN KEY (`expense_account_id`) REFERENCES `accounts` (`AccID`),
  CONSTRAINT `taxes_payable_account_id_foreign` FOREIGN KEY (`payable_account_id`) REFERENCES `accounts` (`AccID`),
  CONSTRAINT `taxes_receivable_account_id_foreign` FOREIGN KEY (`receivable_account_id`) REFERENCES `accounts` (`AccID`),
  CONSTRAINT `taxes_tax_account_id_foreign` FOREIGN KEY (`tax_account_id`) REFERENCES `accounts` (`AccID`),
  CONSTRAINT `taxes_tax_type_id_foreign` FOREIGN KEY (`tax_type_id`) REFERENCES `tax_types` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `taxes`
--

LOCK TABLES `taxes` WRITE;
/*!40000 ALTER TABLE `taxes` DISABLE KEYS */;
/*!40000 ALTER TABLE `taxes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transfers`
--

DROP TABLE IF EXISTS `transfers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `transfers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `transfer_no` varchar(50) NOT NULL,
  `from_account_id` bigint(20) unsigned NOT NULL,
  `to_account_id` bigint(20) unsigned NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `transfer_date` date NOT NULL,
  `method` enum('cash','bank','internal') NOT NULL DEFAULT 'internal',
  `notes` text DEFAULT NULL,
  `status` enum('draft','posted','cancelled') NOT NULL DEFAULT 'posted',
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transfers_transfer_no_unique` (`transfer_no`),
  KEY `transfers_from_account_id_foreign` (`from_account_id`),
  KEY `transfers_to_account_id_foreign` (`to_account_id`),
  KEY `transfers_created_by_foreign` (`created_by`),
  KEY `transfers_updated_by_foreign` (`updated_by`),
  CONSTRAINT `transfers_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `transfers_from_account_id_foreign` FOREIGN KEY (`from_account_id`) REFERENCES `cash_accounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `transfers_to_account_id_foreign` FOREIGN KEY (`to_account_id`) REFERENCES `cash_accounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `transfers_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transfers`
--

LOCK TABLES `transfers` WRITE;
/*!40000 ALTER TABLE `transfers` DISABLE KEYS */;
/*!40000 ALTER TABLE `transfers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_favorite_reports`
--

DROP TABLE IF EXISTS `user_favorite_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_favorite_reports` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `report_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_favorite_reports_user_id_foreign` (`user_id`),
  KEY `user_favorite_reports_report_id_foreign` (`report_id`),
  CONSTRAINT `user_favorite_reports_report_id_foreign` FOREIGN KEY (`report_id`) REFERENCES `financial_reports` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_favorite_reports_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_favorite_reports`
--

LOCK TABLES `user_favorite_reports` WRITE;
/*!40000 ALTER TABLE `user_favorite_reports` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_favorite_reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `first_name` varchar(255) DEFAULT NULL,
  `last_name` varchar(255) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `role` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `department` varchar(255) DEFAULT NULL,
  `position` varchar(255) DEFAULT NULL,
  `hire_date` date DEFAULT NULL,
  `salary` decimal(10,2) DEFAULT NULL,
  `nationality` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive','on-leave','terminated') NOT NULL DEFAULT 'active',
  `address` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `remember_token` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Admin',NULL,NULL,'ah.elshrif10@gmail.com','admin',NULL,NULL,NULL,NULL,NULL,NULL,'active',NULL,NULL,NULL,NULL,'$2y$12$tGv1JFt.IPpn68VVRnehhu70BKExu72KyFOh2xpW34viuN7/4qG7K',NULL,'2026-03-05 10:23:15','2026-03-05 10:23:15');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendor_wallet_transactions`
--

DROP TABLE IF EXISTS `vendor_wallet_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `vendor_wallet_transactions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `vendor_wallet_id` bigint(20) unsigned NOT NULL,
  `amount` decimal(20,2) NOT NULL,
  `type` enum('credit','debit') NOT NULL,
  `status` enum('pending','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
  `reference_type` varchar(255) DEFAULT NULL,
  `reference_id` bigint(20) unsigned DEFAULT NULL,
  `transaction_number` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `vendor_wallet_transactions_transaction_number_unique` (`transaction_number`),
  KEY `vendor_wallet_transactions_vendor_wallet_id_foreign` (`vendor_wallet_id`),
  CONSTRAINT `vendor_wallet_transactions_vendor_wallet_id_foreign` FOREIGN KEY (`vendor_wallet_id`) REFERENCES `vendor_wallets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendor_wallet_transactions`
--

LOCK TABLES `vendor_wallet_transactions` WRITE;
/*!40000 ALTER TABLE `vendor_wallet_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `vendor_wallet_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendor_wallets`
--

DROP TABLE IF EXISTS `vendor_wallets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `vendor_wallets` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `supplier_id` bigint(20) unsigned NOT NULL,
  `balance` decimal(20,2) NOT NULL DEFAULT 0.00,
  `pending_balance` decimal(20,2) NOT NULL DEFAULT 0.00,
  `withdrawn_balance` decimal(20,2) NOT NULL DEFAULT 0.00,
  `currency_id` bigint(20) unsigned NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `vendor_wallets_supplier_id_foreign` (`supplier_id`),
  KEY `vendor_wallets_currency_id_foreign` (`currency_id`),
  CONSTRAINT `vendor_wallets_currency_id_foreign` FOREIGN KEY (`currency_id`) REFERENCES `currencies` (`id`),
  CONSTRAINT `vendor_wallets_supplier_id_foreign` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendor_wallets`
--

LOCK TABLES `vendor_wallets` WRITE;
/*!40000 ALTER TABLE `vendor_wallets` DISABLE KEYS */;
INSERT INTO `vendor_wallets` VALUES (1,1,0.00,0.00,0.00,1,1,'2026-03-05 10:06:54','2026-03-05 10:06:54',NULL);
/*!40000 ALTER TABLE `vendor_wallets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `warehouses`
--

DROP TABLE IF EXISTS `warehouses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `warehouses` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `warehouse_code` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `branch_id` bigint(20) unsigned NOT NULL,
  `manager` varchar(255) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `capacity` int(11) NOT NULL DEFAULT 0,
  `used_capacity` int(11) NOT NULL DEFAULT 0,
  `status` enum('active','inactive','maintenance') NOT NULL DEFAULT 'active',
  `icon` varchar(255) NOT NULL DEFAULT 'warehouse',
  `color` varchar(255) NOT NULL DEFAULT '#3b82f6',
  `description` text DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `warehouses_branch_id_name_unique` (`branch_id`,`name`),
  UNIQUE KEY `warehouses_warehouse_code_unique` (`warehouse_code`),
  CONSTRAINT `warehouses_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `warehouses`
--

LOCK TABLES `warehouses` WRITE;
/*!40000 ALTER TABLE `warehouses` DISABLE KEYS */;
/*!40000 ALTER TABLE `warehouses` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-06  1:46:46
