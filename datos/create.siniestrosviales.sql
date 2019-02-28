-- Table: public.siniestrosviales

-- DROP TABLE public.siniestrosviales;

CREATE TABLE public.siniestrosviales
(
    anio integer,
    mes character varying(20) COLLATE pg_catalog."default",
    diasemana character varying(20) COLLATE pg_catalog."default",
    incidentedesagregado character varying(100) COLLATE pg_catalog."default",
    alcaldia character varying(100) COLLATE pg_catalog."default",
    colonia character varying(100) COLLATE pg_catalog."default",
    geopoint character varying(200) COLLATE pg_catalog."default",
    geoshape character varying(500) COLLATE pg_catalog."default",
    objectid bigint,
    folio character varying(100) COLLATE pg_catalog."default",
    origen character varying(100) COLLATE pg_catalog."default",
    fechacreacion date,
    horacreacion character varying(50) COLLATE pg_catalog."default",
    existenciavid character varying(10) COLLATE pg_catalog."default",
    incidente1 character varying(500) COLLATE pg_catalog."default",
    calle character varying(500) COLLATE pg_catalog."default",
    numero character varying(100) COLLATE pg_catalog."default",
    esquina character varying(500) COLLATE pg_catalog."default",
    codigopostal character varying(50) COLLATE pg_catalog."default",
    latitud character varying(50) COLLATE pg_catalog."default",
    incidenteagregado character varying(250) COLLATE pg_catalog."default",
    longitud character varying(50) COLLATE pg_catalog."default",
    codigocie character varying(50) COLLATE pg_catalog."default",
    detenidos character varying(50) COLLATE pg_catalog."default",
    clasconf character varying(250) COLLATE pg_catalog."default",
    tipoentra character varying(250) COLLATE pg_catalog."default",
    delegaci1 character varying(250) COLLATE pg_catalog."default",
    fecha1 character varying(50) COLLATE pg_catalog."default",
    diames character varying(10) COLLATE pg_catalog."default",
    uid bigint NOT NULL DEFAULT nextval('siniestrosviales_uid_seq'::regclass),
    CONSTRAINT siniestrosviales_pkey PRIMARY KEY (uid)
)
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;

ALTER TABLE public.siniestrosviales
    OWNER to postgres;
