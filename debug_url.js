
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eepuidxxtvcnxrcvmuhi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlcHVpZHh4dHZjbnhyY3ZtdWhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjMwMzEsImV4cCI6MjA4NTc5OTAzMX0.G6f79KaWfav0Dy4Zw_gZ9Vvd89C2NPqw6n3WWC4_y74';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log("--- INSPECTING SERVICE IMAGES ---");

    // Get last 10 completed services with an image_url
    const { data: services, error } = await supabase
        .from('services')
        .select('id, service_type, image_url, status')
        .eq('status', 'Completed')
        .neq('image_url', null)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error("Error:", error);
        return;
    }

    if (services && services.length > 0) {
        services.forEach(s => {
            console.log(`ID: ${s.id}`);
            console.log(`Type: ${s.service_type}`);
            console.log(`URL: [${s.image_url}]`); // Brackets to see whitespace
            console.log("------------------------------------------------");
        });
    } else {
        console.log("No images found.");
    }
}

inspect();
