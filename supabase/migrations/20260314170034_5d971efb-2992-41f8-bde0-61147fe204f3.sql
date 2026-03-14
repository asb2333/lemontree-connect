
-- Make QR scan insert slightly more restrictive - require event_id to exist
DROP POLICY "Anyone can insert scans" ON public.qr_scans;
CREATE POLICY "Insert scans for existing events" ON public.qr_scans 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.events WHERE id = event_id)
  );
