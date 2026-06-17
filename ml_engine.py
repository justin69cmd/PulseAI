from dotenv import load_dotenv
import os

load_dotenv()
# ============================================================
# ML ENGINE — PulseAI
# Symptom Classifier + Report Summarizer + Anomaly Detector
# ============================================================

import re
import json
from groq import Groq

client = Groq(api_key="GROQ_API_KEY")

# ============================================================
# 1. SYMPTOM CLASSIFIER
# ============================================================

def classify_symptoms(symptoms_text):
    """
    Takes symptom description and predicts possible conditions
    with probability scores and urgency level
    """
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": """You are a medical symptom classifier.
            Analyze the symptoms and respond ONLY in this exact JSON format:
            {
                "conditions": [
                    {"name": "Condition Name", "probability": 85, "description": "brief description"},
                    {"name": "Condition Name", "probability": 60, "description": "brief description"},
                    {"name": "Condition Name", "probability": 40, "description": "brief description"}
                ],
                "urgency": "LOW/MEDIUM/HIGH/EMERGENCY",
                "urgency_reason": "reason here",
                "recommended_action": "what to do next",
                "red_flags": ["flag1", "flag2"]
            }
            Return ONLY valid JSON, nothing else."""},
            {"role": "user", "content": f"Classify these symptoms: {symptoms_text}"}
        ]
    )

    try:
        raw = response.choices[0].message.content.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        return json.loads(raw)
    except:
        return {"error": "Could not parse symptoms"}


# ============================================================
# 2. REPORT SUMMARIZER
# ============================================================

def summarize_report(report_text):
    """
    Extracts and structures key findings from medical reports
    """
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": """You are a medical report analyzer.
            Extract key information and respond ONLY in this exact JSON format:
            {
                "patient_info": {
                    "age": "if mentioned",
                    "gender": "if mentioned",
                    "date": "if mentioned"
                },
                "key_findings": [
                    {"finding": "finding description", "significance": "NORMAL/ABNORMAL/CRITICAL"}
                ],
                "diagnoses": ["diagnosis1", "diagnosis2"],
                "medications": ["med1", "med2"],
                "recommendations": ["rec1", "rec2"],
                "follow_up": "follow up instructions if any",
                "summary": "2-3 sentence plain English summary"
            }
            Return ONLY valid JSON, nothing else."""},
            {"role": "user", "content": f"Summarize this medical report:\n{report_text}"}
        ]
    )

    try:
        raw = response.choices[0].message.content.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        return json.loads(raw)
    except:
        return {"error": "Could not parse report"}


# ============================================================
# 3. ANOMALY DETECTOR
# ============================================================

# Reference ranges for common lab values
LAB_RANGES = {
    "hemoglobin":      {"min": 12.0, "max": 17.5, "unit": "g/dL"},
    "glucose":         {"min": 70,   "max": 100,   "unit": "mg/dL"},
    "creatinine":      {"min": 0.6,  "max": 1.2,   "unit": "mg/dL"},
    "sodium":          {"min": 136,  "max": 145,   "unit": "mEq/L"},
    "potassium":       {"min": 3.5,  "max": 5.0,   "unit": "mEq/L"},
    "wbc":             {"min": 4.5,  "max": 11.0,  "unit": "K/uL"},
    "platelets":       {"min": 150,  "max": 400,   "unit": "K/uL"},
    "bilirubin":       {"min": 0.1,  "max": 1.2,   "unit": "mg/dL"},
    "alt":             {"min": 7,    "max": 56,    "unit": "U/L"},
    "ast":             {"min": 10,   "max": 40,    "unit": "U/L"},
    "cholesterol":     {"min": 0,    "max": 200,   "unit": "mg/dL"},
    "triglycerides":   {"min": 0,    "max": 150,   "unit": "mg/dL"},
    "tsh":             {"min": 0.4,  "max": 4.0,   "unit": "mIU/L"},
    "hba1c":           {"min": 0,    "max": 5.7,   "unit": "%"},
    "troponin":        {"min": 0,    "max": 0.04,  "unit": "ng/mL"},
    "crp":             {"min": 0,    "max": 3.0,   "unit": "mg/L"},
}

def detect_anomalies(report_text):
    """
    Scans report text for lab values and flags abnormal ones
    """
    anomalies = []
    normal = []

    for test, ranges in LAB_RANGES.items():
        # Search for the test value in text
        patterns = [
            rf"{test}[:\s]+(\d+\.?\d*)",
            rf"{test.upper()}[:\s]+(\d+\.?\d*)",
            rf"{test.capitalize()}[:\s]+(\d+\.?\d*)",
        ]

        for pattern in patterns:
            match = re.search(pattern, report_text, re.IGNORECASE)
            if match:
                value = float(match.group(1))
                ref = ranges

                if value < ref["min"]:
                    severity = "CRITICAL" if value < ref["min"] * 0.7 else "LOW"
                    anomalies.append({
                        "test": test.upper(),
                        "value": value,
                        "unit": ref["unit"],
                        "status": f"⬇️ BELOW NORMAL",
                        "severity": severity,
                        "reference": f"{ref['min']} - {ref['max']} {ref['unit']}",
                        "difference": f"{round(ref['min'] - value, 2)} below minimum"
                    })
                elif value > ref["max"]:
                    severity = "CRITICAL" if value > ref["max"] * 1.5 else "HIGH"
                    anomalies.append({
                        "test": test.upper(),
                        "value": value,
                        "unit": ref["unit"],
                        "status": f"⬆️ ABOVE NORMAL",
                        "severity": severity,
                        "reference": f"{ref['min']} - {ref['max']} {ref['unit']}",
                        "difference": f"{round(value - ref['max'], 2)} above maximum"
                    })
                else:
                    normal.append({
                        "test": test.upper(),
                        "value": value,
                        "unit": ref["unit"],
                        "status": "✅ NORMAL",
                        "reference": f"{ref['min']} - {ref['max']} {ref['unit']}"
                    })
                break

    # Use AI to find any values we missed
    ai_response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": """Find ALL lab test values in this report.
            Respond ONLY in JSON format:
            {
                "additional_findings": [
                    {
                        "test": "TEST NAME",
                        "value": "value with unit",
                        "status": "NORMAL/ABNORMAL/CRITICAL",
                        "note": "brief clinical note"
                    }
                ]
            }
            Return ONLY valid JSON."""},
            {"role": "user", "content": f"Find lab values in:\n{report_text}"}
        ]
    )

    try:
        raw = ai_response.choices[0].message.content.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        ai_findings = json.loads(raw)
    except:
        ai_findings = {"additional_findings": []}

    return {
        "anomalies": anomalies,
        "normal_values": normal,
        "ai_findings": ai_findings.get("additional_findings", []),
        "total_anomalies": len(anomalies),
        "risk_level": "HIGH" if any(a["severity"] == "CRITICAL" for a in anomalies)
                      else "MEDIUM" if anomalies
                      else "LOW"
    }