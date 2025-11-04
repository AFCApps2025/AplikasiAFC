-- Create customers table if not exists
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100),
    address TEXT,
    cluster VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index on phone_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_phone_number ON public.customers(phone_number);

-- Enable Row Level Security
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is used by work report approval)
CREATE POLICY "Enable read access for all users" ON public.customers
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON public.customers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON public.customers
    FOR UPDATE USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions
GRANT ALL ON public.customers TO anon, authenticated, service_role;
