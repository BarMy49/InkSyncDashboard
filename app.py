from flask import Flask, render_template, jsonify, send_from_directory
import os, json

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/<string:page>')
def get_module(page):
    file_path = f'modules/{page}.json'
    if os.path.exists(file_path):
        with open(file_path, 'r') as f:
            data = json.load(f)
        return jsonify(data)
    return jsonify({'error': 'not found'}), 404

@app.route('/api/check')
def check_files():
    return jsonify({
        'module1': os.path.exists('modules/module1.json'),
        'module2': os.path.exists('modules/module2.json')
    })

if __name__ == '__main__':
    app.run(debug=True)
