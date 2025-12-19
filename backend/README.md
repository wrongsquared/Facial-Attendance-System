# FYPJ

# Automatic Student Attendance System

1. ## To set up the Backend:
    ### Requirements:
        GitHub or GitHub Desktop
        A Supabase Account (Free Tier)

    ### Make sure you're in the backend folder
        cd backend

2. ## To create a python virtual environment 
        python -m  venv .venv

3. ## To start a python virtual environment 
    ### Make sure your ExecutionPolicy is set to RemoteSigned
    To check ExecutionPolicy type the following into powershell/ Terminal
    
        "Get-ExecutionPolicy"
        
    To set ExecutionPolicy, open Windows Powershell or Terminal on Administrator Mode and type in 
    
        "Set-ExecutionPolicy RemoteSigned"

    ### Use Either
    
        .\.venv\Scripts\Activate.ps1
    ### OR
    
        .\.venv\Scripts\Activate.bat   


4. ## Install all required libraries from the requirements.txt file
    ### Upgrade pip first
        python -m pip install --upgrade pip
    ### Install all requirements in the file.
        pip install -r requirements.txt

5. ## Create a Supabase Account 
    ### Create a Supabase Organization and Project, using the free tier.
        Supabase will provide the means for a storage, a PGSQL Database.

6. ## Create an .env file similar to the one given .env.example
    You may rename the file to .env for your purposes.

    From the Supabase Dashboard you may retrieve the following required keys.
    ### SPDB_URL
    In your individual project's navbar, you will see a button labeled "Connect" at the top left.
    Select it and set the Connection Method to Session Pooler, this will ensure that it is connecting in IPV4
    Replace the initial postgres in the first part of the line with 
        
        postgresql+psycopg2
    
    So the start of the Connection String will look like:

        postgresql+psycopg2://postgres(rest of the Connection string to follow)
    ### SPBASE_URL, SPBASE_KEY, SPBASE_SKEY
    This contains the field of your Project's URL.

    In your Supabase project's main Project Overview page, scroll down to "Connecting to your new project", on the right, under Project API you will find the Project's URL and API Key.

    Replace the SPBASE_URL with the URL retrieved from Supabase and the SPBASE_KEY with the key retrieved from Supabase.

    SPBASE_SKEY can be retrieved from Project Settings --> API Keys --> Legacy anon, service_role API keys.
    It is required for the seeding of data and for routing.

7. ## Activate FastAPI
        fastapi dev main.py

8. ## To create a new alembic revision
    You do not have to do this if you're not making any changes to the database table
        
        alembic revision --autogenerate -m "revision name"

9. ## To upgrade to the latest revision
        alembic upgrade head

10. ## To deactivate the virtual environment, just use
        deactivate