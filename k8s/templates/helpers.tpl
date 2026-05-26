{{- define "kill-me.renderMode" -}}
{{- $mode := .Values.renderMode | default "normal" -}}
{{- if not (has $mode (list "normal" "warm" "hot")) -}}
{{- fail (printf "renderMode must be one of: normal, warm, hot; got %q" $mode) -}}
{{- end -}}
{{- $mode -}}
{{- end -}}

{{- define "kill-me.isTestEnv" -}}
{{- $mode := include "kill-me.renderMode" . -}}
{{- if or (eq $mode "warm") (eq $mode "hot") -}}true{{- else -}}false{{- end -}}
{{- end -}}

{{- define "kill-me.renderWarm" -}}
{{- $mode := include "kill-me.renderMode" . -}}
{{- if or (eq $mode "normal") (eq $mode "warm") -}}true{{- else -}}false{{- end -}}
{{- end -}}

{{- define "kill-me.renderHot" -}}
{{- $mode := include "kill-me.renderMode" . -}}
{{- if or (eq $mode "normal") (eq $mode "hot") -}}true{{- else -}}false{{- end -}}
{{- end -}}

{{- define "kill-me.resourceName" -}}
{{- if eq (include "kill-me.isTestEnv" .) "true" -}}
{{- required "testEnv.slotName is required when renderMode is warm or hot" .Values.testEnv.slotName -}}
{{- else -}}
{{- .Values.name | default "kill-me" -}}
{{- end -}}
{{- end -}}

{{- define "kill-me.namespace" -}}
{{- if eq (include "kill-me.isTestEnv" .) "true" -}}
{{- .Release.Namespace -}}
{{- else -}}
{{- .Values.namespace | default .Release.Namespace -}}
{{- end -}}
{{- end -}}
