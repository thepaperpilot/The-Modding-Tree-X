<template>
    <div class="field">
        <span class="field-title" v-if="title">{{ title }}</span>
        <Tooltip :display="`${value}`" :class="{ fullWidth: !title }" :direction="Direction.Down">
            <input type="range" v-model="value" :min="min" :max="max" />
        </Tooltip>
    </div>
</template>

<script setup lang="ts">
import "components/common/fields.css";
import Tooltip from "wrappers/tooltips/Tooltip.vue";
import { Direction } from "util/common";
import { computed } from "vue";

const props = defineProps<{
    title?: string;
    modelValue?: number;
    min?: number;
    max?: number;
}>();

const emit = defineEmits<{
    (e: "update:modelValue", value: number): void;
}>();

const value = computed({
    get() {
        return String(props.modelValue ?? 0);
    },
    set(value: string) {
        emit("update:modelValue", Number(value));
    }
});
</script>

<style scoped>
.fullWidth {
    width: 100%;
}
</style>
