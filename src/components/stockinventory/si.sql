-- Table: types
CREATE TABLE types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    image VARCHAR(255)
);

-- Table: categories
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    image VARCHAR(255),
    type_id INT,
    FOREIGN KEY (type_id) REFERENCES types(id)
);

-- Table: brands
CREATE TABLE brands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    image VARCHAR(255),
    type_id INT,
    category_id INT,
    FOREIGN KEY (type_id) REFERENCES types(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Table: models
CREATE TABLE models (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    image VARCHAR(255),
    brand_id INT,
    category_id INT,
    FOREIGN KEY (brand_id) REFERENCES brands(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Table: departments
CREATE TABLE departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100)
);

-- Table: sections
CREATE TABLE sections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    department_id INT NOT NULL,
    FOREIGN KEY (department_id) REFERENCES si.departments(id) ON DELETE CASCADE
);

-- Table: positions
CREATE TABLE positions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100)
);

-- costcenters table creation
CREATE TABLE IF NOT EXISTS costcenters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NULL,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: districts
CREATE TABLE districts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL
);

-- Table: zones
CREATE TABLE zones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  employee_id INT
  -- Optionally, add a FOREIGN KEY (employee_id) REFERENCES si.employees(id)
);

-- Table: zone_districts
CREATE TABLE zone_districts (
  zone_id INT NOT NULL,
  district_id INT NOT NULL,
  PRIMARY KEY (zone_id, district_id),
  FOREIGN KEY (zone_id) REFERENCES si.zones(id) ON DELETE CASCADE,
  FOREIGN KEY (district_id) REFERENCES si.districts(id) ON DELETE CASCADE
);

-- Table: modules
CREATE TABLE IF NOT EXISTS modules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NULL,
    code VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: users
CREATE TABLE employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    department_id INT,
    section_id INT,
    position_id INT,
    district_id INT,
    image VARCHAR(255),
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (section_id) REFERENCES sections(id),
    FOREIGN KEY (position_id) REFERENCES positions(id),
    FOREIGN KEY (district_id) REFERENCES districts(id)
);

-- Table: vendors
CREATE TABLE vendors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    quote_number VARCHAR(50),
    quote_date DATE,
    quote_status VARCHAR(50)
);

-- Table: procurements
CREATE TABLE procurements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requisition_number VARCHAR(50),
    vendor_id INT,
    purchase_order VARCHAR(50),
    purchase_order_date DATE,
    purchase_order_status VARCHAR(50),
    delivery_date DATE,
    delivery_status VARCHAR(50),
    develivery_order VARCHAR(50),
    invoice_number VARCHAR(50),
    invoice_date DATE,
    invoice_status VARCHAR(50),
    cost_center_id INT,
    department_id INT,
    conditions VARCHAR(50),
    price DECIMAL(10,2),
    currency VARCHAR(10),
    purchase_date DATE,
    warranty_period VARCHAR(50),
    FOREIGN KEY (vendor_id) REFERENCES vendors(id),
    FOREIGN KEY (cost_center_id) REFERENCES departments(id),
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- Table: assets
CREATE TABLE assets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    serial_number VARCHAR(100),
    finance_tag VARCHAR(100),
    model_id INT,
    brand_id INT,
    category_id INT,
    type_id INT,
    status VARCHAR(50),
    depreciation_rate INT,
    procurement_id INT,
    FOREIGN KEY (model_id) REFERENCES models(id),
    FOREIGN KEY (brand_id) REFERENCES brands(id),
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (type_id) REFERENCES types(id),
    FOREIGN KEY (procurement_id) REFERENCES procurements(id)
);

-- Table: asset_users
CREATE TABLE asset_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    asset_id INT,
    handover_date DATE,
    handover_status VARCHAR(50),
    return_date DATE,
    handover_user_id INT,
    FOREIGN KEY (asset_id) REFERENCES assets(id),
    FOREIGN KEY (handover_user_id) REFERENCES employees(id)
);