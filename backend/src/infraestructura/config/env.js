import { z } from 'zod';

const esquema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    DATABASE_URL: z
      .string()
      .regex(/^postgres(ql)?:\/\//, 'es obligatoria y debe empezar por postgresql:// (solo en servidor)'),
    // 'disable' = sin TLS (local); 'require' = TLS verificando el certificado; 'no-verify' = TLS sin verificar
    // (algunos proveedores gestionados usan certificados propios).
    DATABASE_SSL: z.enum(['disable', 'require', 'no-verify']).default('disable'),
    CORS_ORIGINS: z
      .string()
      .default('')
      .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),
    // Saltos de proxy inverso delante de la API (hosting con balanceador = 1).
    TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
    DB_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
    // Peticiones máximas por IP en la ventana (segundos). 0 desactiva el límite.
    RATE_LIMIT_MAX: z.coerce.number().int().min(0).default(120),
    RATE_LIMIT_WINDOW_S: z.coerce.number().int().min(1).default(60),
    // Caché pública del contenido servido (los escenarios publicados son estables).
    CACHE_SECONDS: z.coerce.number().int().min(0).max(86400).default(60),
    DATA_DIR: z.string().default('../../muestras'),
    // DONKI en vivo (NASA CCMC). Endpoint oficial; no requiere clave.
    DONKI_BASE_URL: z.url().default('https://ccmc.gsfc.nasa.gov/DONKI-API'),
    // Caché en servidor: casi en tiempo real sin consultar a NASA en cada petición del cliente.
    DONKI_CACHE_SECONDS: z.coerce.number().int().min(30).max(3600).default(300),
    DONKI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30000).default(10000),
    DONKI_MAX_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  })
  .superRefine((cfg, ctx) => {
    if (cfg.NODE_ENV !== 'production') return;
    const falla = (path, message) => ctx.addIssue({ code: 'custom', path: [path], message });

    if (cfg.CORS_ORIGINS.length === 0) {
      falla('CORS_ORIGINS', 'en producción debe listar el origen del frontend (p. ej. https://usuario.github.io)');
    }
    if (cfg.CORS_ORIGINS.some((o) => o === '*' || !/^https:\/\/[^/]+$/.test(o))) {
      falla('CORS_ORIGINS', 'en producción solo se aceptan orígenes https exactos, sin comodín ni ruta');
    }
    if (/jiimatzin_dev|localhost|127\.0\.0\.1/.test(cfg.DATABASE_URL)) {
      falla('DATABASE_URL', 'apunta a una BD local o usa la contraseña de desarrollo');
    }
    if (cfg.RATE_LIMIT_MAX === 0) {
      falla('RATE_LIMIT_MAX', 'en producción el límite de peticiones no puede desactivarse');
    }
    if (!cfg.DONKI_BASE_URL.startsWith('https://')) {
      falla('DONKI_BASE_URL', 'en producción debe ser https');
    }
    // Excepción: Cloud SQL desde Cloud Run por su socket (host=/cloudsql/...), que ya va cifrado y no admite TLS
    if (cfg.DATABASE_SSL === 'disable' && !/[?&]host=\/cloudsql\//.test(cfg.DATABASE_URL)) {
      falla('DATABASE_SSL', 'en producción usa "require" (o "no-verify" si el proveedor lo exige)');
    }
  });

const resultado = esquema.safeParse(process.env);

if (!resultado.success) {
  const detalle = resultado.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  throw new Error(`Configuración de entorno inválida (revisa las variables de entorno):\n${detalle}`);
}

export const env = resultado.data;
