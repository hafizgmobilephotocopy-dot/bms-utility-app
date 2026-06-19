-- Enums
CREATE TYPE transaction_status AS ENUM (
    'Pending_Processing', 
    'Processed_Successfully', 
    'Gateway_Failed', 
    'Reversed', 
    'Refunded_To_Customer'
);
CREATE TYPE shop_bill_type AS ENUM ('Rent', 'Electricity', 'Water', 'Internet', 'Other');
CREATE TYPE shop_bill_status AS ENUM ('Pending', 'Paid', 'Overdue');

-- Tables
CREATE TABLE shop_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type shop_bill_type NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    due_date DATE NOT NULL,
    status shop_bill_status DEFAULT 'Pending',
    document_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE customer_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    utility_company VARCHAR(255) NOT NULL,
    consumer_number VARCHAR(255) NOT NULL,
    bill_amount DECIMAL(10, 2) NOT NULL,
    service_fee DECIMAL(10, 2) NOT NULL,
    total_cash_collected DECIMAL(10, 2) GENERATED ALWAYS AS (bill_amount + service_fee) STORED,
    status transaction_status DEFAULT 'Pending_Processing',
    date_collected TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE transaction_status_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES customer_transactions(id) ON DELETE CASCADE,
    previous_status transaction_status,
    new_status transaction_status NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE cash_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES customer_transactions(id) ON DELETE SET NULL,
    shop_bill_id UUID REFERENCES shop_bills(id) ON DELETE SET NULL,
    utility_cash_liability DECIMAL(10, 2) DEFAULT 0.00,
    shop_fee_profit DECIMAL(10, 2) DEFAULT 0.00,
    cash_out DECIMAL(10, 2) DEFAULT 0.00,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
