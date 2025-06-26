@echo off
REM Create the main project directory
mkdir flightnet 2>nul

REM Navigate to the project directory
cd flightnet

REM Create all directories
mkdir env 2>nul
mkdir marl 2>nul
mkdir granite_integration 2>nul
mkdir api 2>nul
mkdir api\routes 2>nul
mkdir viz 2>nul
mkdir viz\dashboard_ui 2>nul
mkdir models 2>nul
mkdir tests 2>nul
mkdir config 2>nul

REM Create files in env/
type nul > env\flight_env.py
type nul > env\utils.py

REM Create files in marl/
type nul > marl\train.py
type nul > marl\policy.py
type nul > marl\evaluation.py

REM Create files in granite_integration/
type nul > granite_integration\scenario_parser.py
type nul > granite_integration\reward_shaper.py
type nul > granite_integration\report_generator.py

REM Create files in api/
type nul > api\main.py

REM Create files in api/routes/
type nul > api\routes\simulate.py
type nul > api\routes\report.py
type nul > api\routes\config_gen.py

REM Create files in viz/
type nul > viz\visualizer.py

REM Create files in models/
type nul > models\ppo_model.zip
type nul > models\tokenizer.json

REM Create files in tests/
type nul > tests\test_env.py

REM Create files in config/
type nul > config\default_env.yaml
type nul > config\training_config.json

REM Create root level files
type nul > Dockerfile
type nul > docker-compose.yml
type nul > requirements.txt
type nul > .env
type nul > README.md
type nul > LICENSE

echo FlightNet project structure created successfully!
echo Directory structure:
tree /f 2>nul || dir /s

