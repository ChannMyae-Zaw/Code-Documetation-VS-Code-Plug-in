from flask import Flask, request, jsonify
from flask_cors import CORS
import PyPDF2
import io
from openai import OpenAI
from langchain.prompts import PromptTemplate

app = Flask(__name__)
app.secret_key = 'tErCEsaSISiht'

CORS(app, supports_credentials=True, origins="http://localhost:4200")

@app.route('/api/chat', methods=['POST'])
def chat_with_file():
    """Process a file and apply selected transformations."""
    try:
        # Retrieve user API key from request
        user_api_key = request.form.get('apiKey', '').strip()
        if not user_api_key:
            return jsonify({"error": "API key is required"}), 400
        
        # Retrieve the user prompt
        prompt = request.form.get('prompt', '').strip()
        if not prompt:
            return jsonify({"error": "Prompt is required"}), 400
        
        # Retrieve documentation options
        rename_variables = request.form.get('renameVariables', 'false').lower() == 'true'
        add_comments = request.form.get('addComments', 'false').lower() == 'true'
        
        # Retrieve detail level !!only if adding comments
        detail_level = request.form.get('detailLevel', 'basic').strip().lower() if add_comments else ''
        valid_levels = {'basic', 'intermediate', 'advanced'}
        if detail_level not in valid_levels:
            detail_level = 'basic'  # Default is basic

        extracted_text = process_uploaded_file(request.files.get('file'))

        # Determine the transformation prompt
        combined_prompt = create_transformation_prompt(
            extracted_text, 
            prompt, 
            rename_variables, 
            add_comments, 
            detail_level
        )

        # Send the combined prompt to the OpenAI API
        response_content = get_openai_response(combined_prompt, user_api_key)
        if response_content is None:
            return jsonify({"error": "Failed to get a response from OpenAI"}), 500

        return jsonify({"response": response_content}), 200

    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": "An unexpected error occurred"}), 500

def process_uploaded_file(file):
    """Extract text from the uploaded file, if it is a valid PDF."""
    if not file or not file.filename.endswith('.pdf'):
        return ""

    try:
        pdf_file = io.BytesIO(file.read())
        extracted_text = extract_pdf_text(pdf_file)
        if not extracted_text:
            raise ValueError("Failed to extract text from the PDF")
        return extracted_text.strip()
    except Exception as e:
        print(f"File processing error: {str(e)}")
        return ""

def create_transformation_prompt(extracted_text, user_prompt, rename_variables, add_comments, detail_level):
    """Create a prompt based on selected transformation options."""
    detail_instructions = {
        "basic": "with very brief documentation with short inline comments together in the code.",
        "intermediate": "with detailed documentation with function explanations, parameters, and return values as short block comments",
        "advanced": "with a full, structured documentation including inline comments, function descriptions, examples, and possible optimizations as block comments"
    }

    template = ""
    if extracted_text:
        template += "Follow this coding standard strictly:\n{coding_standard}\n\n"

    template += "Tasks:\n"
    if rename_variables:
        template += "1. Rename variables to be more descriptive and follow the coding standard.\n"
    if add_comments:
        comment_instruction = detail_instructions.get(detail_level, detail_instructions["basic"])
        template += f"2. Add {comment_instruction}\n"

    template += "\nHere is the code to transform:\n{user_code}\n\n"
    template += "Only generate the transformed code output with no conversation."

    coding_standard = f"Coding Standard:\n{extracted_text}" if extracted_text else ""

    prompt = PromptTemplate(
        input_variables=["coding_standard", "user_code"],
        template=template
    )

    return prompt.format(coding_standard=coding_standard, user_code=user_prompt)

def extract_pdf_text(pdf_file):
    """Extract text from PDF in memory."""
    try:
        reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return None

def get_openai_response(prompt: str, user_api_key: str):
    """Function to call OpenAI API and return the response."""
    try:
        client = OpenAI(api_key=user_api_key)
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "system", "content": "You must return only raw code output. No explanations, no markdown, no HTML, and no surrounding text."},
                      {"role": "user", "content": prompt}],
            temperature=0,
        )
        return response.choices[0].message.content
    except Exception as e:
        if 'invalid api key' in str(e).lower():
            return "Invalid API key. Please check your API key in profile settings."
        print(f"Error with OpenAI API: {str(e)}")
        return None

if __name__ == '__main__':
    app.run(debug=True)