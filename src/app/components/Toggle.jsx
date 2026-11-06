import { Switch } from "@base-ui/react/switch";

export default function Toggle({id,label,checked,onChange}) {
  return <div className="toggle-field"><label htmlFor={id}>{label}</label><Switch.Root id={id} className="toggle-control" checked={checked} onCheckedChange={onChange}><Switch.Thumb className="toggle-thumb"/></Switch.Root></div>;
}
