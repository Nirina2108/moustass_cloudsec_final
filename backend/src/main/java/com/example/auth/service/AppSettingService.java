package com.example.auth.service;

import com.example.auth.entity.AppSetting;
import com.example.auth.repository.AppSettingRepository;
import org.springframework.stereotype.Service;

/**
 * Lecture/ecriture des parametres d application stockes en base.
 * Fallback sur la valeur fournie par defaut si non present.
 */
@Service
public class AppSettingService {

    private final AppSettingRepository repo;

    public AppSettingService(AppSettingRepository repo) {
        this.repo = repo;
    }

    public String getOrDefault(String key, String defaultValue) {
        return repo.findBySettingKey(key)
                .map(AppSetting::getSettingValue)
                .orElse(defaultValue);
    }

    public void set(String key, String value) {
        AppSetting entry = repo.findBySettingKey(key).orElseGet(() -> {
            AppSetting created = new AppSetting();
            created.setSettingKey(key);
            return created;
        });
        entry.setSettingValue(value);
        repo.save(entry);
    }
}
