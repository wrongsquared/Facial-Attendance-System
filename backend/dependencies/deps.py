from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException, status
from client import supabase

# This tells Swagger UI to show a "Authorize" button using the /login route
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_current_user_id(token: str = Depends(oauth2_scheme)):
    """
    1. Takes the Token from the Request Header.
    2. Asks Supabase: "Is this token valid?"
    3. Returns the User UUID.
    """
    try:
        # Get user details from Supabase using the token
        user_response = supabase.auth.get_user(token)
        
        if not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        return user_response.user.id
        
    except Exception:
        raise HTTPException(
            status_code=401, 
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )