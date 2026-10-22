from typing import Dict, Any, List
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.machine import Machine, MachineReading, MachinePrediction, AnomalyPrediction, MachineHealthHistory
from app.models.maintenance import MaintenanceRecord
from app.models.inventory import InventoryMaterial, InventoryTransaction
from app.models.production import ProductionSchedule, ProductionBatch, ProductionOrder, ScheduleRevision
from app.models.alert import Alert
from app.models.forecasting import DemandForecast
from app.models.product import Product
from app.models.quality import QualityPrediction
from app.services.analytics import AnalyticsService
from app.core.config import settings
from app.utils.logger import logger

class DecisionAssistantService:
    @staticmethod
    def _mentions_any(query: str, terms: tuple[str, ...]) -> bool:
        return any(term in query for term in terms)

    @staticmethod
    def answer_query(db: Session, query_text: str) -> Dict[str, Any]:
        q = query_text.lower().strip()
        data_context = {}
        answer = ""

        # The assistant answers from operational records; this is not a generative RAG model.
        if DecisionAssistantService._mentions_any(q, ("help", "what can you do", "what can i ask", "supported topics")):
            answer = (
                "I can answer questions using current NexPharmAI records for machine status and telemetry, "
                "failure/anomaly predictions, alerts, maintenance work orders, raw-material inventory, "
                "products, production orders and batches, schedules and revisions, quality assessments, "
                "demand forecasts, and plant OEE. Ask about a specific machine, product, batch, or module. "
                "Answers are based on available database records; I cannot perform actions or provide data that is not stored here."
            )
            data_context = {"supported_modules": [
                "machines", "telemetry", "predictive maintenance", "anomalies", "alerts", "maintenance",
                "inventory", "products", "production", "batches", "scheduler", "quality", "forecasting", "analytics"
            ]}

        # Fleet status and health summary, including natural paraphrases.
        elif (DecisionAssistantService._mentions_any(q, ("fleet", "machine", "machines", "equipment"))
              and DecisionAssistantService._mentions_any(q, ("health", "status", "operating", "running", "how many", "count", "condition"))):
            machines = db.query(Machine).order_by(Machine.machine_id).all()
            status_counts = {}
            for machine in machines:
                status_counts[machine.status] = status_counts.get(machine.status, 0) + 1

            if machines:
                status_summary = ", ".join(
                    f"{count} {status.lower()}" for status, count in sorted(status_counts.items())
                )
                answer = f"Current fleet status: **{len(machines)} machines** total; {status_summary}."
                data_context = {
                    "machine_count": len(machines),
                    "status_counts": status_counts,
                    "machines": [
                        {"machine_id": machine.machine_id, "name": machine.machine_name, "status": machine.status}
                        for machine in machines
                    ]
                }
            else:
                answer = "No machines are registered in the factory database."

        # 2. Active critical/high alerts requiring attention
        elif DecisionAssistantService._mentions_any(q, ("alert", "alerts", "notification", "notifications")):
            active_alerts = db.query(Alert).filter(
                Alert.is_resolved == False,
                Alert.severity.in_(["CRITICAL", "HIGH", "WARNING"])
            ).order_by(Alert.created_at.desc()).limit(10).all()
            if active_alerts:
                lines = []
                alert_context = []
                for alert in active_alerts:
                    machine = db.query(Machine).filter(Machine.id == alert.machine_id).first() if alert.machine_id else None
                    machine_name = machine.machine_id if machine else "Plant Global"
                    lines.append(f"- **{alert.severity}** {alert.title} ({machine_name}): {alert.message}")
                    alert_context.append({
                        "title": alert.title,
                        "severity": alert.severity,
                        "machine_id": machine.machine_id if machine else None,
                        "message": alert.message
                    })
                answer = f"Found **{len(active_alerts)}** unresolved alerts (showing up to 10):\n" + "\n".join(lines)
                data_context = {"active_alerts": alert_context}
            else:
                answer = "There are no unresolved critical or high-severity alerts requiring maintenance dispatch."

        # 3. Plant OEE metrics
        elif "oee" in q or "overall equipment effectiveness" in q:
            summary = AnalyticsService.get_dashboard_summary(db)
            oee = summary["oee"]
            answer = (
                f"Current plant OEE is **{oee['overall']}%** "
                f"(availability {oee['availability']}%, performance {oee['performance']}%, "
                f"quality {oee['quality']}%). This is the application’s operational estimate from current machine, "
                f"telemetry, and quality records."
            )
            data_context = {"oee": oee, "source": "live operational database estimate"}

        # 4. "Which machine has the highest failure risk?" / "failure risk"
        elif DecisionAssistantService._mentions_any(q, ("failure", "risk prediction", "predictive maintenance", "predict failure")):
            highest_pred = db.query(MachinePrediction).order_by(MachinePrediction.failure_probability.desc()).first()
            if highest_pred:
                machine = db.query(Machine).filter(Machine.id == highest_pred.machine_id).first()
                mach_id = machine.machine_id if machine else highest_pred.machine_id
                answer = (
                    f"Machine **{mach_id}** currently has the highest failure risk at "
                    f"**{highest_pred.failure_percentage}%** (Failure Probability: {highest_pred.failure_probability}), "
                    f"evaluated by the {highest_pred.model_name} model. Machine status is currently **{machine.status if machine else 'UNKNOWN'}**."
                )
                data_context = {
                    "machine_id": mach_id,
                    "failure_percentage": highest_pred.failure_percentage,
                    "status": machine.status if machine else "UNKNOWN"
                }
            else:
                answer = "No failure risk predictions have been generated yet. Telemetry readings are needed."

        # 5. "Which machines need maintenance?" / "maintenance"
        elif DecisionAssistantService._mentions_any(q, ("maintenance", "work order", "work orders", "workorder")):
            unhealthy_machines = db.query(Machine).filter(Machine.status.in_(["WARNING", "CRITICAL", "MAINTENANCE"])).all()
            maintenance_records = db.query(MaintenanceRecord).order_by(MaintenanceRecord.scheduled_date.asc()).limit(10).all()
            pending_maint = [record for record in maintenance_records if record.status in ["PENDING", "IN_PROGRESS"]]
            
            mach_names = [f"**{m.machine_id}** ({m.machine_name} - Status: {m.status})" for m in unhealthy_machines]
            order_lines = [
                f"- {record.maintenance_type} ({record.priority}, {record.status}) for machine {record.machine_id}: {record.reason}"
                for record in maintenance_records
            ]
            answer = (
                f"There are **{len(pending_maint)}** pending or in-progress work orders and "
                f"**{len(unhealthy_machines)}** machines in warning, critical, or maintenance status."
            )
            if mach_names:
                answer += "\nMachines needing attention:\n- " + "\n- ".join(mach_names)
            if order_lines:
                answer += "\nRecent work orders:\n" + "\n".join(order_lines)
            data_context = {
                "unhealthy_machines": [m.machine_id for m in unhealthy_machines],
                "pending_work_orders": len(pending_maint),
                "recent_work_orders": [record.id for record in maintenance_records]
            }
            if not mach_names and not order_lines:
                answer += "\nNo maintenance work orders are recorded."

        # 6. "Which machines are currently available?" / "available"
        elif DecisionAssistantService._mentions_any(q, ("machine availability", "machines available", "available machines", "idle machines", "free machines")) or (
            "available" in q and DecisionAssistantService._mentions_any(q, ("machine", "machines", "equipment"))
        ):
            available = db.query(Machine).filter(Machine.status.in_(["RUNNING", "IDLE"])).all()
            if available:
                lines = [f"- **{m.machine_id}** ({m.machine_name}, Line: {m.production_line}, Status: {m.status})" for m in available]
                answer = f"Currently, **{len(available)}** machines are available for production:\n" + "\n".join(lines)
                data_context = {"available_machines": [m.machine_id for m in available]}
            else:
                answer = "No machines are currently available. All units are either in MAINTENANCE, OFFLINE, or CRITICAL state."

        # 7. "Why was the schedule changed?" / "reschedule" / "revision"
        elif DecisionAssistantService._mentions_any(q, ("schedule changed", "reschedule", "revision", "schedule change")):
            latest_revision = db.query(ScheduleRevision).order_by(ScheduleRevision.created_at.desc()).first()
            if latest_revision:
                answer = (
                    f"The schedule was automatically updated under **Revision #{latest_revision.revision_number}**.\n\n"
                    f"**Trigger Event**: `{latest_revision.trigger_event}`\n"
                    f"**Audit Justification**: \"{latest_revision.reason}\"\n"
                    f"**Timestamp**: {latest_revision.created_at.strftime('%Y-%m-%d %H:%M UTC')}"
                )
                data_context = latest_revision.changes_summary or {}
            else:
                answer = "No dynamic schedule revisions have been triggered yet. The primary baseline schedule is currently active."

        # 8. "What materials are low?" / "inventory" / "low stock"
        elif DecisionAssistantService._mentions_any(q, ("inventory", "material", "materials", "stock", "shortage", "reorder", "raw material")):
            low_materials = db.query(InventoryMaterial).filter(
                InventoryMaterial.quantity <= InventoryMaterial.reorder_level
            ).all()
            total_materials = db.query(InventoryMaterial).count()
            if low_materials:
                lines = [
                    f"- **{m.material_name}** (`{m.material_code}`): Current Stock = **{m.quantity} {m.unit}** (Reorder Threshold: {m.reorder_level} {m.unit})"
                    for m in low_materials
                ]
                answer = f"**{len(low_materials)} of {total_materials}** raw materials are at or below their reorder level:\n" + "\n".join(lines)
                data_context = {"total_materials": total_materials, "low_materials": [m.material_code for m in low_materials]}
            else:
                answer = f"All **{total_materials}** registered raw materials are currently above their reorder thresholds."
                data_context = {"total_materials": total_materials, "low_materials": []}

        # 9. "What is today's production schedule?" / "schedule"
        elif "production schedule" in q or "today's schedule" in q or "schedule" in q:
            active_sched = db.query(ProductionSchedule).filter(ProductionSchedule.status == "ACTIVE").first()
            if active_sched and active_sched.schedule_metadata and "assignments" in active_sched.schedule_metadata:
                assignments = active_sched.schedule_metadata["assignments"]
                lines = [
                    f"- Batch **{a.get('batch_number')}** ({a.get('product_name')}): Assigned to **{a.get('machine_id')}**, Window: {a.get('start_time')} to {a.get('end_time')}"
                    for a in assignments[:5]
                ]
                answer = (
                    f"Active schedule: **{active_sched.schedule_name}** (Makespan: {active_sched.total_makespan_hours}h, Status: {active_sched.optimizer_status}).\n"
                    f"Scheduled jobs:\n" + "\n".join(lines)
                )
                if len(assignments) > 5:
                    answer += f"\n*(and {len(assignments) - 5} more batches scheduled)*"
                data_context = {"schedule_id": active_sched.id, "total_batches": len(assignments)}
            else:
                answer = "No active production schedule is currently generated. You can trigger optimization from the Scheduler module."

        # 10. "What anomalies happened?" / "anomalies"
        elif DecisionAssistantService._mentions_any(q, ("anomal", "outlier", "sensor drift")):
            anomalies = db.query(AnomalyPrediction).filter(AnomalyPrediction.anomaly_detected == 1).order_by(AnomalyPrediction.timestamp.desc()).limit(5).all()
            if anomalies:
                lines = [
                    f"- Machine **{a.machine_id}** at {a.timestamp.strftime('%H:%M:%S')}: Severity = **{a.severity}** (Score: {a.anomaly_score})"
                    for a in anomalies
                ]
                answer = f"Found **{len(anomalies)}** recent mechanical anomalies detected by Isolation Forest:\n" + "\n".join(lines)
                data_context = {"anomaly_count": len(anomalies)}
            else:
                answer = "No mechanical anomalies have been detected. All sensor vectors are within normal multivariate tolerances."

        # 11. "Which production orders are delayed?" / "orders"
        elif DecisionAssistantService._mentions_any(q, ("order", "orders", "delayed", "production demand")):
            orders = db.query(ProductionOrder).filter(ProductionOrder.status.in_(["PLANNED", "ON_HOLD"])).all()
            if orders:
                lines = [
                    f"- Order **{o.order_code}**: Status = `{o.status}`, Priority = {o.priority}, Due: {o.due_date.strftime('%Y-%m-%d')}"
                    for o in orders
                ]
                answer = f"Current pending / held production orders:\n" + "\n".join(lines)
                data_context = {"orders_count": len(orders)}
            else:
                answer = "All production orders are on track and scheduled."

        elif DecisionAssistantService._mentions_any(q, ("quality", "cqa", "release", "quarantine", "quality prediction")):
            predictions = db.query(QualityPrediction).order_by(QualityPrediction.created_at.desc()).limit(10).all()
            if predictions:
                lines = [
                    f"- Batch {prediction.batch_id}: {prediction.status}, score {prediction.quality_score}/100, "
                    f"risk {prediction.quality_risk}, pass probability {prediction.pass_probability:.1%}"
                    for prediction in predictions
                ]
                answer = "Recent batch quality assessments (a PASS is a QA recommendation, not a formal release):\n" + "\n".join(lines)
                data_context = {"quality_assessments": [
                    {"batch_id": item.batch_id, "status": item.status, "score": item.quality_score, "risk": item.quality_risk}
                    for item in predictions
                ]}
            else:
                answer = "No batch quality assessments have been recorded yet."
                data_context = {"quality_assessments": []}

        elif DecisionAssistantService._mentions_any(q, ("forecast", "forecasting", "demand projection", "projected demand")):
            forecasts = db.query(DemandForecast).order_by(DemandForecast.created_at.desc()).limit(100).all()
            latest_by_product = {}
            for forecast in forecasts:
                latest_by_product.setdefault(forecast.product_id, forecast)
            if latest_by_product:
                lines = []
                forecast_context = []
                for product_id, forecast in latest_by_product.items():
                    product = db.query(Product).filter(Product.id == product_id).first()
                    product_name = product.product_name if product else product_id
                    lines.append(
                        f"- {product_name}: {forecast.predicted_demand:,.0f} units projected for "
                        f"{forecast.forecast_date.strftime('%Y-%m-%d')} (horizon {forecast.horizon_days} days)"
                    )
                    forecast_context.append({"product": product_name, "product_id": product_id,
                                             "daily_demand": forecast.predicted_demand,
                                             "forecast_date": forecast.forecast_date.isoformat(),
                                             "horizon_days": forecast.horizon_days})
                answer = "Latest stored demand forecast points by product:\n" + "\n".join(lines)
                data_context = {"forecasts": forecast_context}
            else:
                answer = "No demand forecasts have been generated yet. Generate one in the Demand Forecasting module first."
                data_context = {"forecasts": []}

        elif DecisionAssistantService._mentions_any(q, ("products", "sku", "formulation", "pharmaceutical")):
            products = db.query(Product).filter(Product.status == "ACTIVE").order_by(Product.product_code).limit(20).all()
            if products:
                lines = [
                    f"- {product.product_name} ({product.product_code}), batch size {product.batch_size}, "
                    f"standard production time {product.standard_production_time:g} hours"
                    for product in products
                ]
                answer = f"There are **{len(products)}** active products in the catalog (showing up to 20):\n" + "\n".join(lines)
                data_context = {"products": [{"name": product.product_name, "code": product.product_code} for product in products]}
            else:
                answer = "No active products are registered in the product catalog."
                data_context = {"products": []}

        elif DecisionAssistantService._mentions_any(q, ("batch", "batches", "manufacturing run")):
            batches = db.query(ProductionBatch).order_by(ProductionBatch.created_at.desc()).limit(10).all()
            if batches:
                lines = [f"- {batch.batch_number}: {batch.status}, {batch.quantity:,} units" for batch in batches]
                answer = "Recent production batches:\n" + "\n".join(lines)
                data_context = {"batches": [{"batch_number": batch.batch_number, "status": batch.status,
                                              "quantity": batch.quantity} for batch in batches]}
            else:
                answer = "No production batches are registered yet."
                data_context = {"batches": []}

        elif DecisionAssistantService._mentions_any(q, ("sensor", "telemetry", "reading", "rpm", "torque", "temperature", "tool wear")):
            readings = db.query(MachineReading).order_by(MachineReading.timestamp.desc()).limit(10).all()
            if readings:
                lines = []
                reading_context = []
                for reading in readings:
                    machine = db.query(Machine).filter(Machine.id == reading.machine_id).first()
                    machine_code = machine.machine_id if machine else reading.machine_id
                    lines.append(
                        f"- {machine_code}: {reading.rotational_speed:g} rpm, torque {reading.torque:g} Nm, "
                        f"air/process temperature {reading.air_temperature:g}/{reading.process_temperature:g} K, "
                        f"tool wear {reading.tool_wear:g} min"
                    )
                    reading_context.append({"machine_id": machine_code, "timestamp": reading.timestamp.isoformat(),
                                            "rotational_speed": reading.rotational_speed, "torque": reading.torque,
                                            "air_temperature": reading.air_temperature,
                                            "process_temperature": reading.process_temperature,
                                            "tool_wear": reading.tool_wear})
                answer = "Latest stored machine telemetry readings:\n" + "\n".join(lines)
                data_context = {"readings": reading_context}
            else:
                answer = "No sensor telemetry readings have been recorded yet."
                data_context = {"readings": []}

        # Explicit, honest fallback instead of presenting unrelated counts as an answer.
        else:
            answer = (
                "I couldn't match that question to a supported NexPharmAI data area, so I don't want to guess. "
                "Try asking about a machine, sensor reading, prediction, alert, work order, inventory item, "
                "product/SKU, order, batch, schedule, quality assessment, forecast, or OEE. "
                "Ask 'what can you help with?' for the supported areas."
            )

        return {
            "query": query_text,
            "answer": answer,
            "data_context": data_context,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
