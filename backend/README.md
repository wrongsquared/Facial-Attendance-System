# FYPJ

# Automatic Student Attendance System

1. ## To set up the Backend:
    ### Requirements:
        Github Desktop
        Docker Desktop
        Postman
        PostgreSQL & PGadmin

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


5. ## Start up/ Compose the Docker Instance
        docker compose up --build

6. ## Create the Database in PostgresSQL through Pgadmin
    Name it whatever you want, But in the connection settings, set these,

        Host Name: localhost
        Maintenance Database = Same name as your Database

7. ## Activate FastAPI
        fastapi dev main.py

8. ## To create a new alembic revision
    You do not have to do this if you're not making any changes to the database table
        
        alembic revision --autogenerate -m "revision name"

9. ## To upgrade to the latest revision
        alembic upgrade head

10. ## To deactivate the virtual environment, just use
        deactivate

11. ## If the Docker Instance needs to be nuked,
        docker compose down -v