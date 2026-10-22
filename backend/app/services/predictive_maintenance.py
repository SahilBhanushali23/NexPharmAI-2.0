import pandas as pd
import numpy as np
from datetime import datetime, timezone
from app.ai.model_loader import model_loader
from app.schemas.predictive_maintenance import PMPredictionInput, PMPredictionResponse
from app.utils.logger import logger

class PredictiveMaintenanceService:
    @staticmethod
    def _model_machine_type(machine_type: str) -> str:
        normalized_type = machine_type.strip().upper()
        return normalized_type if normalized_type in {"L", "M", "H"} else "M"

    @staticmethod
    def predict(input_data: PMPredictionInput) -> dict:
        loader = model_loader
        if loader.pm_model is None or loader.preprocessor is None:
            # Fallback deterministic heuristic if models failed to load
            logger.warning("Predictive maintenance model not loaded, using heuristic fallback")
            prob = 0.05
            if input_data.tool_wear > 200: prob += 0.4
            if input_data.torque > 60: prob += 0.3
            if input_data.process_temperature - input_data.air_temperature < 8.6: prob += 0.2
            prob = min(prob, 0.99)
            pred = 1 if prob >= 0.5 else 0
            model_name = "Heuristic-Fallback"
        else:
            # Build DataFrame matching feature columns
            df = pd.DataFrame([{
                "Type": PredictiveMaintenanceService._model_machine_type(input_data.machine_type),
                "Air temperature [K]": float(input_data.air_temperature),
                "Process temperature [K]": float(input_data.process_temperature),
                "Rotational speed [rpm]": float(input_data.rotational_speed),
                "Torque [Nm]": float(input_data.torque),
                "Tool wear [min]": float(input_data.tool_wear)
            }])
            
            X_proc = loader.preprocessor.transform(df)
            pred = int(loader.pm_model.predict(X_proc)[0])
            if hasattr(loader.pm_model, "predict_proba"):
                prob = float(loader.pm_model.predict_proba(X_proc)[0][1])
            else:
                prob = 0.9 if pred == 1 else 0.1
            model_name = loader.pm_metadata.get("model_name", "Production ML Model")

        percentage = round(prob * 100, 2)
        if prob >= 0.70 or pred == 1:
            status = "CRITICAL"
        elif prob >= 0.35:
            status = "WARNING"
        else:
            status = "NORMAL"

        return {
            "prediction": pred,
            "failure_probability": round(prob, 4),
            "failure_percentage": percentage,
            "status": status,
            "model_name": model_name,
            "timestamp": datetime.now(timezone.utc)
        }
