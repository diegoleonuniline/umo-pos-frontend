// ============================================
// UMO POS - CONFIGURACIÓN
// ============================================

const CONFIG = {
    // URL del backend en Heroku
    API_URL: 'https://umo-pos-api-71a155958263.herokuapp.com',
    
    // Logo UMO
    LOGO_URL: 'https://res.cloudinary.com/dstcnsu6a/image/upload/v1754346747/ChatGPT_Image_4_ago_2025_16_32_04_cpudux.png',
    
    // Tasas de cambio por defecto
    DEFAULT_RATES: {
        USD: 17.50,
        CAD: 13.00,
        EUR: 19.00
    },
    
    // Tiempo de cache en ms (5 minutos)
    CACHE_DURATION: 300000
};

// No modificar
Object.freeze(CONFIG);
