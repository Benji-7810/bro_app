import os
import json
import uuid
from datetime import datetime
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# Fichier de stockage des données
DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data.json')

def load_data():
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Erreur de lecture du fichier JSON: {e}")
        return []

def save_data(data):
    try:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Erreur d'écriture dans le fichier JSON: {e}")
        return False

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/activities', methods=['GET'])
def get_activities():
    return jsonify(load_data())

@app.route('/api/activities', methods=['POST'])
def add_activity():
    data = request.json
    if not data:
        return jsonify({"error": "Données manquantes"}), 400
    
    activity_type = data.get('type')
    duration = data.get('duration') # en minutes
    date_str = data.get('date') # YYYY-MM-DD
    intensity = data.get('intensity', 'Moyenne') # Faible, Moyenne, Intense
    notes = data.get('notes', '')
    
    if not activity_type or not duration or not date_str:
        return jsonify({"error": "Les champs type, duration et date sont requis"}), 400
        
    try:
        duration = int(duration)
    except ValueError:
        return jsonify({"error": "La durée doit être un nombre entier"}), 400

    new_activity = {
        "id": str(uuid.uuid4()),
        "type": activity_type,
        "duration": duration,
        "date": date_str,
        "intensity": intensity,
        "notes": notes,
        "created_at": datetime.now().isoformat()
    }
    
    activities = load_data()
    activities.append(new_activity)
    
    # Trier par date décroissante pour l'affichage
    activities.sort(key=lambda x: x['date'], reverse=True)
    
    if save_data(activities):
        return jsonify(new_activity), 201
    else:
        return jsonify({"error": "Impossible de sauvegarder la session"}), 500

@app.route('/api/activities/<activity_id>', methods=['DELETE'])
def delete_activity(activity_id):
    activities = load_data()
    updated_activities = [act for act in activities if act['id'] != activity_id]
    
    if len(activities) == len(updated_activities):
        return jsonify({"error": "Activité non trouvée"}), 404
        
    if save_data(updated_activities):
        return jsonify({"success": True}), 200
    else:
        return jsonify({"error": "Impossible de sauvegarder après suppression"}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)