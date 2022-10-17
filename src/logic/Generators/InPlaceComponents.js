import { Dropdown } from 'primereact/dropdown'
import { Inplace, InplaceContent, InplaceDisplay } from 'primereact/inplace'
import { InputText } from 'primereact/inputtext'

export const InPlaceElement = (props) => {
    return (
        <Inplace active={props.active} closable onToggle={props.onToggle}>
            <InplaceDisplay style={{ ...props.displayStyle }}>
                {props.display}
            </InplaceDisplay>
            <InplaceContent>
                {props.element === 'input' ? (
                    <PresetInPlaceInput {...props} />
                ) : (
                    <PresetInPlaceDropdown {...props} />
                )}
            </InplaceContent>
        </Inplace>
    )
}

export const PresetInPlaceInput = (props) => {
    return (
        <div className="flex">
            <InputText
                id={props.id}
                value={props.state[props.id]}
                autoFocus
                type={props.type || 'text'}
                className="block p-inputtext-sm"
                onChange={props.handleChange}
                style={props.style}
            />
        </div>
    )
}

export const PresetInPlaceDropdown = (props) => {
    return (
        <Dropdown
            id={props.id}
            value={props.state[props.id]}
            options={props.options}
            onChange={props.handleChange}
            placeholder={props.defaultValue || 'Select Option'}
            editable={props.editable}
        />
    )
}

// @TODO: Convert InitialState.js to proper data structure so it can be iterated rather than having a huge JSX file
const InPlaceField = (props) => {
    return (
        <div className="column flex">
            <span className="inplace-static-text">{props.preText}</span>
            <InPlaceElement
                id={props.id}
                active={props.active}
                display={props.id}
                type={props.elementType}
                element={props.element}
                handleChange={props.handleChange}
                state={props.state}
            />
            <span className="inplace-static-text">{props.postText}</span>
        </div>
    )
}
