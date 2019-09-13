import * as React from 'react'
import useReactRouter from 'use-react-router'
import { Link } from 'react-router-dom'
import { Box, Heading, Button, Text } from 'rebass'
import { Label, Input } from '@rebass/forms'

import { useBackend } from '../../hooks/backend'
import { useConfig } from '../../hooks/config'
import sleep from '../../util/sleep'

type FormErrorData = FormData & { invalidSettings: boolean }

interface FormData {
    url: string
    group: string
    token: string
}

// tslint:disable-next-line:cyclomatic-complexity
export const SettingsPage = () => {
    const { history } = useReactRouter()
    const { testConfig } = useBackend()
    const { config, updateConfig, removeConfig } = useConfig()

    const [confirmDelete, setConfirmDelete] = React.useState(false)
    const [submitting, setSubmitting] = React.useState(false)
    const [errors, setErrors] = React.useState<FormErrorData>({
        url: '',
        token: '',
        group: '',
        invalidSettings: false,
    })
    const [values, setValues] = React.useState<FormData>({
        url: config ? config.url : '',
        token: config ? config.token : '',
        group: config ? config.group : '',
    })

    const setError = (name: keyof FormErrorData, errorMessage: string | boolean) => {
        setErrors({ ...errors, [name]: errorMessage })
    }

    const handleChange = (name: keyof FormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setValues({ ...values, [name]: event.target.value })
    }

    const confirmRemove = async () => {
        setConfirmDelete(true)
    }

    const remove = async () => {
        removeConfig()
        setErrors({ url: '', token: '', group: '', invalidSettings: false })
        setValues({ url: '', token: '', group: '' })
    }

    const save = async () => {
        setSubmitting(true)
        setErrors({ url: '', token: '', group: '', invalidSettings: false })

        if (!values.url) {
            setError('url', 'Please enter your GitLab URL.')
        }
        if (!values.token) {
            setError('token', 'Please enter your Personal Access Token.')
        }
        if (!values.group) {
            setError('group', 'Please enter your Group Name')
        }

        if (values.url && values.token) {
            const newConfig = {
                url: values.url,
                token: values.token,
                group: values.group,
            }

            try {
                await testConfig(newConfig)
                updateConfig(newConfig)

                await sleep(1000)
                history.push('/')
            } catch (_) {
                setError('invalidSettings', true)
            } finally {
                setSubmitting(false)
            }
        }
    }

    const renderRemoveButton = () => {
        return confirmDelete ? (
            <Button mx='auto' my={3} sx={{ display: 'block' }} variant='secondary' onClick={remove}>
                Are you sure?
            </Button>
        ) : (
            <Button mx='auto' my={3} sx={{ display: 'block' }} variant='outline' onClick={confirmRemove}>
                remove config
            </Button>
        )
    }

    return (
        <Box p={2}>
            <Heading fontSize={2}>Settings</Heading>
            <form autoComplete='off'>
                {errors.invalidSettings && <Text color='red'>Could not load your merge requests. Please verify your settings.</Text>}
                <Box my={2}>
                    <Label htmlFor='url'>GitLab URL</Label>
                    <Input
                        id='url'
                        name='url'
                        type='url'
                        placeholder='https://gitlab.org'
                        value={values.url}
                        onChange={handleChange('url')}
                        disabled={submitting}
                        required
                    />
                    {!!errors.url && <Text color='red'>{errors.url}</Text>}
                </Box>

                <Box my={2}>
                    <Label htmlFor='group'>GitLab Group Name</Label>
                    <Input
                        id='group'
                        name='group'
                        type='text'
                        placeholder='my-company'
                        value={values.group}
                        onChange={handleChange('group')}
                        disabled={submitting}
                        required
                    />
                    {!!errors.group && <Text color='red'>{errors.group || 'You find it in the url to your projects: <groupName>/<projectName>'}</Text>}
                </Box>

                <Box my={2}>
                    <Label htmlFor='token'>Personal Access Token</Label>
                    <Input
                        id='token'
                        name='token'
                        type='text'
                        placeholder='my-company'
                        value={values.token}
                        onChange={handleChange('token')}
                        disabled={submitting}
                        required
                    />
                    {!!errors.token && <Text color='red'>{errors.token || 'You find it in the url to your projects: <groupName>/<projectName>'}</Text>}
                </Box>

                <Button mt={4} sx={{ display: 'block', width: '100%' }} variant='primary' aria-label='add' onClick={save} disabled={submitting}>
                    Save
                </Button>
                {config && !submitting && renderRemoveButton()}
                <Box my={3}>
                    <Text textAlign='center'>{config && !submitting && <Link to='/'>go back</Link>}</Text>
                </Box>
            </form>
        </Box>
    )
}
