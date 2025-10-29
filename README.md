# FYPJ

Automatic Student Attendance System










=============================================
                    Backend
=============================================

1. To set up the Backend:
1A. Requirements:
Github Desktop
Docker Desktop
Postman

1B. Make sure you're in the backend folder
cd backend

2. Install all required libraries from the requirements.txt file
2A. Upgrade pip first
python -m pip install --upgrade pip
2B. Install all requirements in the file.
pip install -r requirements.txt

3. To create a .venv, 
python -m  venv .venv

4. To start a .venv using, using either the .ps1 file or .bat file
.\.venv\Scripts\Activate.ps1
.\.venv\Scripts\Activate.bat    

5. Start up/ Compose the Docker Instance
docker compose up --build

6. Activate FastAPI
fastapi dev main.py

7. To create a new alembic revision, you don't have to do this if you're not making any changes to the database table
alembic revision --autogenerate -m "revision name"

8. To upgrade to the latest revision
alembic upgrade head

9. To deactivate the virtual environment, just use
deactivate

10. If the Docker Instance needs to be nuked,
docker compose down -v