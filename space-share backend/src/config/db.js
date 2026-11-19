const { supabaseAdmin, supabaseAnon } = require('./config');

// Using Supabase JS client directly for all database operations
module.exports = {
  supabaseAdmin,
  supabaseAnon,
};
