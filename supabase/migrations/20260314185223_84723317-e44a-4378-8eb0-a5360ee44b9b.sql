
-- Create a function to award points when a QR scan is recorded
CREATE OR REPLACE FUNCTION public.award_referral_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.volunteer_id IS NOT NULL THEN
    UPDATE public.profiles
    SET points = COALESCE(points, 0) + 10
    WHERE user_id = NEW.volunteer_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on qr_scans
CREATE TRIGGER on_qr_scan_award_points
  AFTER INSERT ON public.qr_scans
  FOR EACH ROW
  EXECUTE FUNCTION public.award_referral_points();

-- Allow anonymous users to insert scans (people scanning flyers aren't necessarily logged in)
-- The existing policy requires event to exist, which is good. But we also need to allow anon inserts.
CREATE POLICY "Anyone can insert scans"
ON public.qr_scans
FOR INSERT
TO anon
WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = qr_scans.event_id));

-- Allow authenticated users to view their own scans (already exists) and allow public SELECT for scan counting
CREATE POLICY "Event creators can view scans"
ON public.qr_scans
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM events WHERE events.id = qr_scans.event_id AND events.created_by = auth.uid())
);
