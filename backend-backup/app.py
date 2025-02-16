from flask import Flask, request, jsonify
from flask_cors import CORS
import PyPDF2
import io
from openai import OpenAI
from langchain.prompts import PromptTemplate

# Set up OpenAI client (use your API key securely)
# client = OpenAI(api_key="API_KEY")

app = Flask(__name__)
app.secret_key = 'tErCEsaSISiht'

# Enable CORS
CORS(app, supports_credentials=True, origins="http://localhost:4200")

@app.route('/api/chat', methods=['POST'])
def chat_with_file():
    """Process a file, combine its content with a user prompt, and send it to OpenAI."""
    try:
        # Retrieve user API key from request
        user_api_key = request.form.get('apiKey', '').strip()
        if not user_api_key:
            return jsonify({"error": "API key is required"}), 400
        
        # Retrieve the user prompt
        prompt = request.form.get('prompt', '').strip()
        if not prompt:
            return jsonify({"error": "Prompt is required"}), 400
        
        # Retrieve detail level
        detail_level = request.form.get('detailLevel', 'basic').strip().lower()
        valid_levels = {'basic', 'intermediate', 'advanced'}
        if detail_level not in valid_levels:
            detail_level = 'basic'  # Default to basic if invalid

        # Optional: Retrieve and process the uploaded file
        extracted_text = process_uploaded_file(request.files.get('file'))

        # Combine the extracted text (if any) with the user prompt
        combined_prompt = create_combined_prompt(extracted_text, prompt, detail_level)

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


def create_combined_prompt(extracted_text, user_prompt, detail_level):
    detail_prompts = {
        "basic": "with very brief documentation with short inline comments together in the code.",
        "intermediate": "with detailed documentation with function explanations, parameters, and return values as comments",
        "advanced": "with a full, structured documentation including inline comments, function descriptions, examples, and possible optimizations as comments"
    }

    instruction = detail_prompts.get(detail_level, detail_prompts["basic"])

    template = """Generate the corrected code following this following coding standard ,{instruction}.
   
{coding_standard}

Here is the code to fix:
{user_code}
Only generate the code output with no conversation.
"""

    coding_standard = f"Here is the coding standard:\n{extracted_text} which should be followed strictly" if extracted_text else ""

    prompt = PromptTemplate(
        input_variables=["instruction", "coding_standard", "user_code"],
        template=template
    )

    return prompt.format(instruction=instruction, coding_standard=coding_standard, user_code=user_prompt)


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
            model="gpt-4",
            messages=[{"role": "system", "content": "You only generate raw code output."},
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
