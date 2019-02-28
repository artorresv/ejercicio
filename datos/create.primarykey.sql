ALTER TABLE public.siniestrosviales
    ADD COLUMN uid bigserial NOT NULL;
    
ALTER TABLE public.siniestrosviales
    ADD PRIMARY KEY (uid);