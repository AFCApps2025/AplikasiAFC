-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'teknisi' CHECK (role IN ('admin', 'teknisi', 'supervisor')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create work reports table
CREATE TABLE public.work_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  ac_unit_number TEXT NOT NULL,
  brand TEXT NOT NULL,
  unit_spec_photo_url TEXT,
  work_date DATE NOT NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('cuci_ac', 'perbaikan')),
  technician_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  condition_notes TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view all profiles for work reports" 
ON public.profiles 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- RLS Policies for customers
CREATE POLICY "Authenticated users can view customers" 
ON public.customers 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create customers" 
ON public.customers 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update customers" 
ON public.customers 
FOR UPDATE 
USING (auth.role() = 'authenticated');

-- RLS Policies for work reports
CREATE POLICY "Authenticated users can view work reports" 
ON public.work_reports 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create work reports" 
ON public.work_reports 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update work reports" 
ON public.work_reports 
FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Create storage bucket for unit spec photos
INSERT INTO storage.buckets (id, name, public) VALUES ('unit-specs', 'unit-specs', true);

-- Storage policies
CREATE POLICY "Anyone can view unit spec photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'unit-specs');

CREATE POLICY "Authenticated users can upload unit spec photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'unit-specs' AND auth.role() = 'authenticated');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_work_reports_updated_at
BEFORE UPDATE ON public.work_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'User'),
    'teknisi'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();