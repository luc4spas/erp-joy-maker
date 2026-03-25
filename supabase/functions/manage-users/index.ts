import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Extract token from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    
    // Use the service role client to verify the token and get the user
    const { data: { user: caller }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !caller) throw new Error("Unauthorized");

    const { data: isAdmin } = await supabase.rpc("user_is_admin", { _user_id: caller.id });
    if (!isAdmin) throw new Error("Admin access required");

    const { action, ...payload } = await req.json();

    if (action === "list") {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
      const authMap = new Map(authUsers?.map(u => [u.id, u]) || []);

      const enriched = profiles?.map(p => ({
        ...p,
        last_sign_in: authMap.get(p.user_id)?.last_sign_in_at || null,
        email_confirmed: !!authMap.get(p.user_id)?.email_confirmed_at,
      }));

      return new Response(JSON.stringify(enriched), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "create") {
      const { email, password, nome, unidade, cargo } = payload;
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nome },
      });
      if (createError) throw createError;

      await supabase.from("profiles").update({ unidade, cargo }).eq("user_id", newUser.user!.id);

      return new Response(JSON.stringify({ success: true, user_id: newUser.user!.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      const { user_id, nome, unidade, cargo, ativo, email, password } = payload;

      await supabase.from("profiles").update({ nome, unidade, cargo, ativo }).eq("user_id", user_id);

      const authUpdate: any = {};
      if (email) authUpdate.email = email;
      if (password) authUpdate.password = password;
      if (Object.keys(authUpdate).length > 0) {
        await supabase.auth.admin.updateUserById(user_id, authUpdate);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { user_id } = payload;
      await supabase.auth.admin.deleteUser(user_id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
