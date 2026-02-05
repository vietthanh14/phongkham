
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eepuidxxtvcnxrcvmuhi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlcHVpZHh4dHZjbnhyY3ZtdWhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjMwMzEsImV4cCI6MjA4NTc5OTAzMX0.G6f79KaWfav0Dy4Zw_gZ9Vvd89C2NPqw6n3WWC4_y74';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkImages() {
    console.log("Checking recent completed services with images...");

    const { data: services, error } = await supabase
        .from('services')
        .select('id, service_type, image_url, status, created_at')
        .eq('status', 'Completed')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error:", error);
        return;
    }

    if (services && services.length > 0) {
        services.forEach(s => {
            console.log(`[${s.created_at}] Service: ${s.service_type}`);
            console.log(`\tURL: ${s.image_url}`);
        });
    } else {
        console.log("No completed services found.");
    }
}

checkImages();
