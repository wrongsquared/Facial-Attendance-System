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
    Select it and go to Connection String, set the Connection Method to Session Pooler, copy the given string into "SPDB_URL" and
    Replace the initial postgres in the first part of the line with 
        
        postgresql+psycopg2
    
    So the start of the Connection String will look like:

        "postgresql+psycopg2://postgres"(rest of the Connection string to follow)
    The password is the Database Password set during the creation of the Database.

    ### SPBASE_URL, SPBASE_KEY, SPBASE_SKEY
    This contains the field of your Project's URL.

    In the sliding menu to the left of your Project's Dashboard, look for "Project Settings", select and look for "Data API"
    This is where you will take the "SPBASE_URL" key.

    You will find the SPBASE_KEY, SPBASE_SKEY in "Project Settings" under "API Keys", they are the Publishable keys and Secret Keys respectively. You may create your own API keys by pressing either "New publishable key" or "New Secret Key". For this project, you may just use the defaults given.

7. ## Activate FastAPI
        fastapi dev main.py

8. ## To create a new alembic revision
    You do not have to do this if you're not making any changes to the database table
        
        alembic revision --autogenerate -m "revision name"

9. ## To upgrade to the latest revision
        alembic upgrade head

10. ## To deactivate the virtual environment, just use
        deactivate