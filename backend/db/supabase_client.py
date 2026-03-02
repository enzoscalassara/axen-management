import os
from supabase import create_client, Client
from core.config import settings

def get_supabase_admin() -> Client:
    """
    Cria um cliente Supabase com a Service Role Key.
    Use APENAS para operações administrativas no backend que ignoram RLS.
    """
    url: str = settings.supabase_url
    key: str = settings.supabase_service_key
    return create_client(url, key)

def get_supabase_client(token: str = None) -> Client:
    """
    Cria um cliente Supabase. 
    Se um token for fornecido, o cliente agirá em nome do usuário autenticado (respeitando RLS).
    Caso contrário, usa a anon key.
    """
    url: str = settings.supabase_url
    key: str = settings.supabase_key # anon key
    
    client = create_client(url, key)
    
    if token:
        client.postgrest.auth(token)
        
    return client
