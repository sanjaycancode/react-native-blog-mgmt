import type {
  ControllerFieldState,
  ControllerRenderProps,
  FieldPath,
  FieldValues,
} from "react-hook-form";

/**
 * Base helper to map react-hook-form props.
 */
export const formFieldHelper = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(props: {
  field: ControllerRenderProps<TFieldValues, TName>;
  fieldState: ControllerFieldState;
}) => ({
  value: props.field.value,
  onBlur: props.field.onBlur,
  error: !!props.fieldState.error,
  helperText: props.fieldState.error?.message,
});

/**
 * Helper to map react-hook-form props to text input props.
 */
export const formTextInputHelper = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(props: {
  field: ControllerRenderProps<TFieldValues, TName>;
  fieldState: ControllerFieldState;
}) => ({
  ...formFieldHelper(props),
  onChangeText: props.field.onChange,
});
