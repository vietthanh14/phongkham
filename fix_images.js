
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eepuidxxtvcnxrcvmuhi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlcHVpZHh4dHZjbnhyY3ZtdWhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjMwMzEsImV4cCI6MjA4NTc5OTAzMX0.G6f79KaWfav0Dy4Zw_gZ9Vvd89C2NPqw6n3WWC4_y74';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixImages() {
    console.log("Starting Image URL Repair...");

    // Fetch all services with old Google Drive links
    const { data: services, error } = await supabase
        .from('services')
        .select('id, image_url')
        .ilike('image_url', '%drive.google.com%');

    if (error) {
        console.error("Fetch Error:", error);
        return;
    }

    if (!services || services.length === 0) {
        console.log("No services found needing repair.");
        return;
    }

    console.log(`Found ${services.length} services to check/repair.`);
    let fixedCount = 0;

    for (const s of services) {
        const url = s.image_url;
        // Extract ID. Format usually: https://drive.google.com/uc?id=FILE_ID&export=view
        // Or sometimes: https://drive.google.com/file/d/FILE_ID/view

        let fileId = null;

        // Try 'id=' pattern
        const idMatch = url.match(/id=([a-zA-Z0-9_-]+)/);
        if (idMatch && idMatch[1]) {
            fileId = idMatch[1];
        } else {
            // Try '/d/' pattern
            const dMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (dMatch && dMatch[1]) {
                fileId = dMatch[1];
            }
        }

        if (fileId) {
            const newUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
            if (newUrl !== url) {
                console.log(`Fixing [${s.id}]: Extract ID ${fileId}`);

                const { error: updateError } = await supabase
                    .from('services')
                    .update({ image_url: newUrl })
                    .eq('id', s.id);

                if (updateError) console.error(`  Update Failed: ${updateError.message}`);
                else fixedCount++;
            }
        } else {
            console.log(`Skipping [${s.id}]: Could not extract ID from ${url}`);
        }
    }

    console.log(`Repair Complete. Fixed ${fixedCount} records.`);
}

fixImages();
